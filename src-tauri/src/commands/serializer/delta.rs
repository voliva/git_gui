use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
pub enum DeltaReadError {
    UnsupportedDeltaType,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct File {
    pub id: String,
    pub path: String,
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

#[derive(Serialize, Deserialize, Debug)]
pub enum FileChange {
    Added(File),
    Untracked(File),
    Copied(File, File),
    Deleted(File),
    Renamed(File, File),
    Modified(File, File),
}

#[derive(Serialize, Deserialize)]
pub struct Delta {
    pub change: FileChange,
    binary: bool,
}

impl<'a> TryFrom<git2::DiffDelta<'a>> for Delta {
    type Error = DeltaReadError;

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
            git2::Delta::Untracked => FileChange::Untracked(value.new_file().into()),
            v => {
                println!("unsupported delta type {:?}", v);
                return Err(DeltaReadError::UnsupportedDeltaType);
            }
        };

        Ok(Delta {
            change,
            binary: value.flags().is_binary(),
        })
    }
}
