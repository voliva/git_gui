use std::path::{Path, PathBuf};

use super::serializer::delta::{Delta, FileChange};
use git2::{IndexAddOption, Repository};
use serde::Serialize;

#[derive(Serialize)]
pub enum StageError {
    Read(String),
}

impl From<git2::Error> for StageError {
    fn from(value: git2::Error) -> Self {
        StageError::Read(value.message().to_owned())
    }
}

#[tauri::command(async)]
pub fn stage(path: String, delta: Option<Delta>) -> Result<(), StageError> {
    let repo = Repository::open(path)?;

    let mut index = repo.index()?;
    if let Some(delta) = delta {
        let file = match delta.change {
            FileChange::Added(f) => f,
            FileChange::Untracked(f) => f,
            FileChange::Copied(_, f) => f,
            FileChange::Deleted(f) => f,
            FileChange::Renamed(_, f) => f,
            FileChange::Modified(_, f) => f,
        };

        index.add_path(&PathBuf::from(file.path))?;
        index.write()?;
    } else {
        let flag = IndexAddOption::default();
        index.add_all(vec!["*"], flag, None)?;
        index.write()?;
    }

    Ok(())
}

#[tauri::command(async)]
pub fn unstage(path: String, delta: Option<Delta>) -> Result<(), StageError> {
    let repo = Repository::open(path)?;

    let mut index = repo.index()?;
    let head = repo.head()?.peel_to_tree()?;
    if let Some(delta) = delta {
        let file = match delta.change {
            FileChange::Added(f) => f,
            FileChange::Untracked(f) => f,
            FileChange::Copied(_, f) => f,
            FileChange::Deleted(f) => f,
            FileChange::Renamed(_, f) => f,
            FileChange::Modified(_, f) => f,
        };

        // let tree = head.get_path(&PathBuf::from(file.path))?;
        // index.read_tree(&tree);
        // index.write()?;
    } else {
        index.read_tree(&head)?;
        index.write()?;
    }

    Ok(())
}
