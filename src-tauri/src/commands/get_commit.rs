use git2::{Oid, Repository};
use serde::Serialize;

#[derive(Serialize, Debug)]
pub enum GetCommitError {
    UnsupportedDeltaType,
    Read(String),
}

impl From<git2::Error> for GetCommitError {
    fn from(value: git2::Error) -> Self {
        GetCommitError::Read(value.message().to_owned())
    }
}

#[derive(Serialize)]
struct File {
    id: String,
    path: String,
}

impl<'a> From<git2::DiffFile<'a>> for File {
    fn from(value: git2::DiffFile) -> Self {
        File {
            id: value.id().to_string(),
            path: value
                .path()
                .and_then(|buf| buf.to_str())
                .map(|x| x.to_owned())
                .unwrap(),
        }
    }
}

#[derive(Serialize)]
enum FileChange {
    Added(File),
    Copied(File, File),
    Deleted(File),
    Renamed(File, File),
    Modified(File, File),
}

#[derive(Serialize)]
struct Delta {
    change: FileChange,
    binary: bool,
}

impl<'a> TryFrom<git2::DiffDelta<'a>> for Delta {
    type Error = GetCommitError;

    fn try_from(value: git2::DiffDelta) -> Result<Self, Self::Error> {
        let change = match value.status() {
            git2::Delta::Added => FileChange::Added(value.new_file().into()),
            git2::Delta::Copied => {
                FileChange::Copied(value.old_file().into(), value.new_file().into())
            }
            git2::Delta::Deleted => FileChange::Deleted(value.old_file().into()),
            git2::Delta::Modified => {
                FileChange::Modified(value.old_file().into(), value.new_file().into())
            }
            git2::Delta::Renamed => {
                FileChange::Renamed(value.old_file().into(), value.new_file().into())
            }
            _ => {
                return Err(GetCommitError::UnsupportedDeltaType);
            }
        };

        Ok(Delta {
            change,
            binary: value.flags().is_binary(),
        })
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
    // println!("Stats: {:?}", diff.stats());
    // diff.deltas().take(1).for_each(|delta| {
    //     // println!("Delta: {:?}", delta);
    //     println!("nfiles {}", delta.nfiles());
    //     println!("status {:?}", delta.status());
    //     println!("flags {:?}", delta.flags());
    //     println!("old file {:?}", delta.old_file().id());
    //     println!("new file {:?}", delta.new_file().id());
    //     println!("path {:?}", delta.new_file().path());
    //     println!("mode {:?}", delta.new_file().mode());
    //     println!("size {:?} bytes", delta.new_file().size());
    // });
    // let mut shown = false;
    // diff.foreach(
    //     &mut |delta, float| {
    //         println!("delta {}", delta.nfiles());
    //         if !shown {
    //             shown = true;
    //             return true;
    //         } else {
    //             return true;
    //         }
    //     },
    //     Some(&mut |delta, binary| {
    //         println!(
    //             "binary {} -> {}",
    //             binary.old_file().inflated_len(),
    //             binary.new_file().inflated_len()
    //         );
    //         true
    //     }),
    //     Some(&mut |delta, hunk| {
    //         println!("hunk {:?}", hunk);
    //         true
    //     }),
    //     Some(&mut |delta, hunk, line| {
    //         println!("line {:?}", line);
    //         true
    //     }),
    // )?;
}
