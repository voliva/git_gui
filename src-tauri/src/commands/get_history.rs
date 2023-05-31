use std::{
    iter::{Filter, FilterMap},
    path::Path,
};

use git2::{Oid, Repository, Revwalk, Sort};
use logging_timer::time;

use super::serializer::git_error::GitError;

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

struct HistoryIterator<'a> {
    repo: &'a Repository,
    path: String,
    walker: Revwalk<'a>,
    visited: usize,
    returned: usize,
}

impl<'a> HistoryIterator<'a> {
    fn new(
        repo: &'a Repository,
        path: String,
        commit_id: Option<Oid>,
    ) -> Result<HistoryIterator<'a>, git2::Error> {
        let mut walker = repo.revwalk()?;
        walker.set_sorting(Sort::TOPOLOGICAL)?;

        if let Some(id) = commit_id {
            walker.push(id)?;
        } else {
            walker.push_head()?;
        }

        // let commit = if let Some(id) = commit_id {
        //     repo.find_commit(id)?
        // } else {
        //     repo.head()?.peel_to_commit()?
        // };
        // let blob_id = commit.tree()?.get_path(&Path::new(&path))?.id();

        Ok(HistoryIterator {
            repo,
            path,
            walker,
            visited: 0,
            returned: 0,
        })
    }
}

impl Iterator for HistoryIterator<'_> {
    type Item = Oid;

    fn next(&mut self) -> Option<Self::Item> {
        let path: &Path = Path::new(&self.path);

        // let commit_id = self
        //     .walker
        //     .filter_map(|result| result.ok())
        //     .filter_map(|id| {
        //         let commit = self.repo.find_commit(id).unwrap();
        //         let tree = commit.tree().unwrap();
        //         let entry = tree.get_path(&path).unwrap();
        //         if entry.id() == self.blob_id {
        //             None
        //         } else {
        //             Some((id, entry.id()))
        //         }
        //     })
        //     .next();
        while let Some(result) = self.walker.next() {
            if let Ok(id) = result {
                self.visited += 1;
                let commit = self.repo.find_commit(id).unwrap();

                let tree = commit.tree().unwrap();
                let entry = tree.get_path(&path);

                if let Err(_) = entry {
                    // self.walker.hide(id).unwrap();
                    commit
                        .parents()
                        .for_each(|parent| self.walker.hide(parent.id()).unwrap());
                    continue;
                }
                let entry = entry.unwrap();

                // Don't include merge commits as part of history
                if commit.parent_count() != 1 {
                    continue;
                }

                let parent_commit = commit.parent(0).unwrap();
                let parent_entry = parent_commit.tree().unwrap().get_path(&path);

                if parent_entry.is_err() {
                    self.walker.hide(parent_commit.id()).unwrap();
                }
                if parent_entry.is_err() || parent_entry.unwrap().id() != entry.id() {
                    self.returned += 1;
                    return Some(id);
                }
            }
        }

        println!("Stats: {}/{}", self.returned, self.visited);

        None
    }
}
