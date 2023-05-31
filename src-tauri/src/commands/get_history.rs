use std::{
    collections::HashSet,
    iter::{Filter, FilterMap},
    path::Path,
};

use git2::{Oid, Repository, Revwalk, Sort};
use logging_timer::time;

use super::{commit, serializer::git_error::GitError};

#[time]
#[tauri::command(async)]
pub fn get_history(
    path: String,
    file_path: String,
    commit_id: Option<String>,
) -> Result<(), GitError> {
    let repo = Repository::open(path)?;

    // let res = get_history_walker(
    //     &repo,
    //     &Path::new(&file_path),
    //     commit_id.map(|id| Oid::from_str(&id).unwrap()),
    // )?;
    let res = HistoryIterator::new(
        &repo,
        file_path,
        commit_id.map(|id| Oid::from_str(&id).unwrap()),
    )?;
    res.for_each(|id| {
        println!("history {:?}", id);
    });

    Ok(())
}

pub fn get_history_walker<'a>(
    repo: &'a Repository,
    path: &'a Path,
    commit_id: Option<Oid>,
) -> Result<
    Filter<
        FilterMap<Revwalk<'a>, impl FnMut(Result<Oid, git2::Error>) -> Option<Oid> + 'a>,
        impl FnMut(&Oid) -> bool + 'a,
    >,
    GitError,
> {
    let mut walker = repo.revwalk()?;
    walker.set_sorting(Sort::TOPOLOGICAL.union(Sort::TIME))?;

    if let Some(id) = commit_id {
        walker.push(id)?;
    } else {
        walker.push_head()?;
    }

    // This would be better but WalkerWithHideCallback is not exported :(
    // let walker = walker.with_hide_callback(&|id| {
    //     let commit = repo.find_commit(id).unwrap();
    //     let tree = commit.tree().unwrap();
    //     tree.get_path(path).is_err()
    // })?;
    // TODO try with impl Repository { some filter function } then use with_hide_callback outside?

    let filtered = walker.filter_map(|result| result.ok()).filter(move |id| {
        let commit = repo.find_commit(*id).unwrap();
        let tree = commit.tree().unwrap();

        let entry = tree.get_path(path);

        if let Err(_) = entry {
            println!("Err entry");
            return true;
        }
        if let Ok(entry) = entry {
            println!("found {:?} {:?}", &path, entry.id())
        }
        return true;

        tree.get_path(path).is_err()
    });

    Ok(filtered)
}

struct HistoryIteratorHead {
    path: String,
    oid: Oid,
}

struct HistoryIterator<'a> {
    repo: &'a Repository,
    heads: Vec<HistoryIteratorHead>,
    visited: HashSet<Oid>,
    returned: usize,
}

impl<'a> HistoryIterator<'a> {
    fn new(
        repo: &'a Repository,
        path: String,
        commit_id: Option<Oid>,
    ) -> Result<HistoryIterator<'a>, git2::Error> {
        let oid = commit_id.unwrap_or_else(|| repo.head().unwrap().peel_to_commit().unwrap().id());

        Ok(HistoryIterator {
            repo,
            heads: vec![HistoryIteratorHead { path, oid }],
            visited: HashSet::new(),
            returned: 0,
        })
    }
}

fn pop_set<T: std::cmp::Eq + std::hash::Hash + Clone>(set: &mut HashSet<T>) -> Option<T> {
    let next = set.iter().next();
    if let Some(v) = next {
        let v = v.clone();
        set.take(&v)
    } else {
        None
    }
}

impl Iterator for HistoryIterator<'_> {
    type Item = Oid;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(head) = self.heads.pop() {
            if self.visited.contains(&head.oid) {
                continue;
            }
            self.visited.insert(head.oid.clone());

            let commit = self.repo.find_commit(head.oid).unwrap();

            if commit.parent_count() != 1 {
                commit.parent_ids().for_each(|oid| {
                    self.heads.push(HistoryIteratorHead {
                        path: head.path.clone(),
                        oid,
                    });
                });
                continue;
            }

            let path = Path::new(head.path.as_str());
            let tree = commit.tree().unwrap();
            let entry = tree.get_path(&path);
            if let Err(_) = entry {
                continue;
            }
            let entry = entry.unwrap();

            let parent_commit = commit.parent(0).unwrap();
            let parent_entry = parent_commit.tree().unwrap().get_path(&path);

            if !parent_entry.is_err() {
                self.heads.push(HistoryIteratorHead {
                    path: head.path.clone(),
                    oid: parent_commit.id(),
                });
            }

            if parent_entry.is_err() || parent_entry.unwrap().id() != entry.id() {
                self.returned += 1;
                return Some(head.oid);
            }
        }

        println!("Stats: {}/{}", self.returned, self.visited.len());

        None
    }
}
