use std::path::PathBuf;

use super::serializer::delta::{Delta, FileChange};
use git2::{ErrorCode, Index, IndexAddOption, Repository};
use logging_timer::time;
use serde::Serialize;

#[derive(Serialize)]
pub enum StageError {
    Read(String),
    UnstageError,
    EntryDoesntExistOnHead,
}

impl From<git2::Error> for StageError {
    fn from(value: git2::Error) -> Self {
        StageError::Read(value.message().to_owned())
    }
}

#[time]
#[tauri::command(async)]
pub fn stage(path: String, delta: Option<Delta>) -> Result<(), StageError> {
    let repo = Repository::open(path)?;

    if let Some(delta) = delta {
        match delta.change {
            FileChange::Untracked(f) => add_from_working_dir(&repo, Some(&f.path)),
            FileChange::Copied(_, f) => add_from_working_dir(&repo, Some(&f.path)), // TODO check
            FileChange::Deleted(f) => remove_from_index(&repo, &f.path),
            FileChange::Renamed(old, new) => {
                remove_from_index(&repo, &old.path)?;
                add_from_working_dir(&repo, Some(&new.path))
            }
            FileChange::Modified(_, f) => add_from_working_dir(&repo, Some(&f.path)),
            v => unreachable!("unreachable {:?}", v),
        }
    } else {
        add_from_working_dir(&repo, None)
    }
}

fn add_from_working_dir(repo: &Repository, path: Option<&str>) -> Result<(), StageError> {
    let mut index = repo.index()?;

    if let Some(path) = path {
        index.add_path(&PathBuf::from(path))?;
        index.write()?;
    } else {
        let flag = IndexAddOption::default();
        index.add_all(vec!["*"], flag, None)?;
        index.write()?;
    }
    Ok(())
}

#[time]
#[tauri::command(async)]
pub fn unstage(path: String, delta: Option<Delta>) -> Result<(), StageError> {
    let repo = Repository::open(path)?;

    if let Some(delta) = delta {
        match delta.change {
            FileChange::Added(f) => remove_from_index(&repo, &f.path),
            FileChange::Copied(_, f) => remove_from_index(&repo, &f.path), // TODO check
            FileChange::Deleted(f) => recover_index_from_head(&repo, &f.path),
            FileChange::Renamed(old, new) => {
                recover_index_from_head(&repo, &old.path)?;
                remove_from_index(&repo, &new.path)
            }
            FileChange::Modified(_, f) => reset_index_to_head(&repo, Some(&f.path)),
            v => unreachable!("unreachable {:?}", v),
        }
    } else {
        reset_index_to_head(&repo, None)
    }
}

fn reset_index_to_head(repo: &Repository, path: Option<&str>) -> Result<(), StageError> {
    println!("reset_index_to_head");
    let mut index = repo.index()?;
    let head_result = repo.head().and_then(|head| head.peel_to_tree());

    if let Err(err) = &head_result {
        // Case repo without head (just initialised)
        if err.code() == ErrorCode::UnbornBranch {
            index.remove_all(["*"], None)?;
            index.write()?;
            return Ok(());
        }
    }
    let head = head_result?;

    if let Some(path) = path {
        // Reference https://stackoverflow.com/a/35093146/1026619
        let index_entry = index.iter().find(|entry| {
            std::str::from_utf8(&entry.path)
                .map(|str| str.eq(path))
                .unwrap_or(false)
        });

        let tree_entry = head.get_path(&PathBuf::from(path))?;
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

fn recover_index_from_head(repo: &Repository, path: &str) -> Result<(), StageError> {
    let head = repo.head()?.peel_to_tree()?;
    let mut head_index = Index::new()?;
    head_index.read_tree(&head)?;

    if let Some(entry) = head_index.get_path(&PathBuf::from(path), 0) {
        let mut index = repo.index()?;
        index.add(&entry)?;
        index.write()?;
        Ok(())
    } else {
        Err(StageError::EntryDoesntExistOnHead)
    }
}

fn remove_from_index(repo: &Repository, path: &str) -> Result<(), StageError> {
    let mut index = repo.index()?;

    index.remove_path(&PathBuf::from(path))?;
    index.write()?;
    Ok(())
}
