use crate::commands::serializer::delta::Delta;
use git2::{Oid, Repository};
use log::error;
use logging_timer::time;
use serde::Serialize;

use super::serializer::git_error::GitError;

#[derive(Serialize)]
pub struct CommitContents {
    insertions: usize,
    deletions: usize,
    deltas: Vec<Delta>,
}

#[time]
#[tauri::command(async)]
pub fn get_commit(path: String, id: String) -> Result<CommitContents, GitError> {
    let repo = Repository::open(path)?;

    let commit = repo.find_commit(Oid::from_str(&id)?)?;
    let commit_tree = commit.tree()?;
    let parent_tree = commit
        .parents()
        .next()
        .and_then(|parent| parent.tree().ok());

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), None)?;
    let stats = diff.stats()?;

    Ok(CommitContents {
        insertions: stats.insertions(),
        deletions: stats.deletions(),
        deltas: diff
            .deltas()
            .filter_map(|d| {
                let old_file = d.old_file().path().map(|x| x.to_owned());
                let new_file = d.old_file().path().map(|x| x.to_owned());

                match Delta::try_from(d) {
                    Ok(delta) => Some(delta),
                    Err(err) => {
                        error!(
                            "Error mapping delta {:?} -> {:?}: {:?}",
                            old_file, new_file, err
                        );
                        None
                    }
                }
            })
            .collect(),
    })
}
