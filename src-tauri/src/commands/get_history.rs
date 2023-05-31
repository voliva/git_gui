use priority_queue::PriorityQueue;
use std::{collections::HashSet, path::Path};

use git2::{Oid, Repository};
use logging_timer::time;

use crate::positioned_commit::CommitInfo;

use super::serializer::git_error::GitError;

#[time]
#[tauri::command(async)]
pub fn get_history(
    path: String,
    file_path: String,
    commit_id: Option<String>,
) -> Result<Vec<CommitInfo>, GitError> {
    let repo = Repository::open(path)?;

    let history = HistoryIterator::new(
        &repo,
        file_path,
        commit_id.map(|id| Oid::from_str(&id).unwrap()),
    )?;

    let commits = history
        .map(|oid| {
            let commit = repo.find_commit(oid).unwrap();

            CommitInfo::new(&commit)
        })
        .collect();

    Ok(commits)
}

#[derive(Hash, PartialEq, Eq)]
struct HistoryIteratorHead {
    path: String,
    oid: Oid,
}

struct HistoryIterator<'a> {
    repo: &'a Repository,
    heads: PriorityQueue<HistoryIteratorHead, i64>,
    visited: HashSet<Oid>,
}

impl<'a> HistoryIterator<'a> {
    fn new(
        repo: &'a Repository,
        path: String,
        commit_id: Option<Oid>,
    ) -> Result<HistoryIterator<'a>, git2::Error> {
        let oid = commit_id.unwrap_or_else(|| repo.head().unwrap().peel_to_commit().unwrap().id());
        let mut heads = PriorityQueue::new();
        heads.push(HistoryIteratorHead { path, oid }, 0);

        Ok(HistoryIterator {
            repo,
            heads,
            visited: HashSet::new(),
        })
    }
}

impl Iterator for HistoryIterator<'_> {
    type Item = Oid;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some((head, _)) = self.heads.pop() {
            if self.visited.contains(&head.oid) {
                continue;
            }
            self.visited.insert(head.oid.clone());

            let commit = self.repo.find_commit(head.oid).unwrap();

            if commit.parent_count() != 1 {
                commit.parent_ids().for_each(|oid| {
                    self.heads.push(
                        HistoryIteratorHead {
                            path: head.path.clone(),
                            oid,
                        },
                        commit.time().seconds(),
                    );
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
                self.heads.push(
                    HistoryIteratorHead {
                        path: head.path.clone(),
                        oid: parent_commit.id(),
                    },
                    parent_commit.time().seconds(),
                );
            }

            if parent_entry.is_err() || parent_entry.unwrap().id() != entry.id() {
                return Some(head.oid);
            }
        }

        None
    }
}
