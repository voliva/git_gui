use git2::Oid;
use rocket::http::ContentType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
pub enum DeltaReadError {
    UnsupportedDeltaType,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct File {
    pub id: String,
    pub path: String,
}

impl<'a> From<git2::DiffFile<'a>> for File {
    fn from(value: git2::DiffFile) -> Self {
        // On some cases a modified file in the working directory would come with an id that doesn't exist.
        // This protects against this case.
        let id = if value.is_valid_id() {
            value.id().to_string()
        } else {
            Oid::zero().to_string()
        };

        File {
            id,
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

impl FileChange {
    pub fn get_newest_file(&self) -> &File {
        match self {
            FileChange::Added(f) => f,
            FileChange::Untracked(f) => f,
            FileChange::Copied(_, f) => f,
            FileChange::Deleted(f) => f,
            FileChange::Renamed(_, f) => f,
            FileChange::Modified(_, f) => f,
        }
    }
    pub fn get_oldest_file(&self) -> &File {
        match self {
            FileChange::Added(f) => f,
            FileChange::Untracked(f) => f,
            FileChange::Copied(f, _) => f,
            FileChange::Deleted(f) => f,
            FileChange::Renamed(f, _) => f,
            FileChange::Modified(f, _) => f,
        }
    }
    pub fn get_files(&self) -> (Option<&File>, Option<&File>) {
        match self {
            FileChange::Added(new) => (None, Some(new)),
            FileChange::Untracked(new) => (None, Some(new)),
            FileChange::Copied(old, new) => (Some(old), Some(new)),
            FileChange::Deleted(old) => (Some(old), None),
            FileChange::Renamed(old, new) => (Some(old), Some(new)),
            FileChange::Modified(old, new) => (Some(old), Some(new)),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Delta {
    pub change: FileChange,
    binary: bool,
    mime_type: Option<String>,
}

impl<'a> TryFrom<git2::DiffDelta<'a>> for Delta {
    type Error = DeltaReadError;

    fn try_from(value: git2::DiffDelta) -> Result<Self, Self::Error> {
        let change = match value.status() {
            git2::Delta::Added => FileChange::Added(value.new_file().into()),
            git2::Delta::Copied => {
                println!("Copied!!!"); // I couldn't see any instance of this happening?
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
        let binary = value.flags().is_binary();

        let path = change.get_newest_file().path.clone();
        let last_point = path.len() - path.chars().rev().take_while(|x| x != &'.').count();
        let extension = if last_point > 0 {
            Some(&path[last_point..])
        } else {
            None
        };
        let mime_type = extension
            .and_then(|ext| ContentType::from_extension(ext))
            .map(|content_type| content_type.to_string());
        println!("Extension {:?} mime_type {:?}", extension, mime_type);

        Ok(Delta {
            change,
            binary,
            mime_type,
        })
    }
}
