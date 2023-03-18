use std::path::PathBuf;

use super::serializer::delta::{Delta, FileChange};
use git2::{IndexAddOption, Repository};
use serde::Serialize;

#[derive(Serialize)]
pub enum StageError {
    Read(String),
    UnstageError,
}

impl From<git2::Error> for StageError {
    fn from(value: git2::Error) -> Self {
        StageError::Read(value.message().to_owned())
    }
}

// TODO check for repos without index (just after initializing)
// TODO check for repos without commit (just after initializing)

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
        // TODO check for all types. Atm it works for modified
        let file = match delta.change {
            FileChange::Added(f) => f,
            FileChange::Untracked(f) => f,
            FileChange::Copied(_, f) => f,
            FileChange::Deleted(f) => f,
            FileChange::Renamed(_, f) => f,
            FileChange::Modified(_, f) => f,
        };

        let index_entry = index.iter().find(|entry| {
            std::str::from_utf8(&entry.path)
                .map(|str| str.eq(&file.path))
                .unwrap_or(false)
        });

        let tree_entry = head.get_path(&PathBuf::from(file.path))?;
        let obj = tree_entry.to_object(&repo)?;
        let blob = obj.as_blob();

        if let Some((index_entry, blob)) = index_entry.as_ref().zip(blob) {
            index.add_frombuffer(index_entry, blob.content())?;
            index.write()?;
        } else {
            println!("index_entry: {:?}", index_entry);
            println!("blob: {:?}", blob);
            return Err(StageError::UnstageError);
        }
    } else {
        index.read_tree(&head)?;
        index.write()?;
    }

    Ok(())
}
