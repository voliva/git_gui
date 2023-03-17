use crate::commands::serializer::delta::Delta;
use git2::{Oid, Repository};
use serde::Serialize;

#[derive(Serialize, Debug)]
pub enum GetCommitError {
    Read(String),
}

impl From<git2::Error> for GetCommitError {
    fn from(value: git2::Error) -> Self {
        GetCommitError::Read(value.message().to_owned())
    }
}

#[derive(Serialize)]
pub struct CommitContents {
    insertions: usize,
    deletions: usize,
    deltas: Vec<Delta>,
}

#[tauri::command(async)]
pub fn get_commit(path: String, id: String) -> Result<CommitContents, GetCommitError> {
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
        deltas: diff.deltas().map(|d| d.try_into().unwrap()).collect(),
    })
}
