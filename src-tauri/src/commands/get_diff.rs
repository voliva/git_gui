use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    str::FromStr,
};

use crate::commands::serializer::delta::{Delta, File};
use git2::{Blob, DiffHunk, DiffLine, DiffOptions, Oid, Repository};
use logging_timer::time;
use serde::{Deserialize, Serialize};

use super::serializer::git_error::GitError;

#[derive(Serialize)]
pub struct DeltaDiff {
    old_file: Option<String>,
    new_file: Option<String>,
    hunks: Vec<Hunk>,
}

#[derive(Serialize, Deserialize)]
pub struct Hunk {
    pub old_range: (u32, u32),
    pub new_range: (u32, u32),
    pub header: String,
    changes: Vec<Change>,
}

impl<'a> From<DiffHunk<'a>> for Hunk {
    fn from(hunk: DiffHunk) -> Self {
        Hunk {
            old_range: (hunk.old_start(), hunk.old_lines()),
            new_range: (hunk.new_start(), hunk.new_lines()),
            header: String::from_utf8_lossy(hunk.header()).to_string(),
            changes: vec![],
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Change {
    pub side: Side,
    pub line_num: u32,
    pub change_type: char,
}

impl<'a> TryFrom<DiffLine<'a>> for Change {
    type Error = ();

    fn try_from(line: DiffLine) -> Result<Self, Self::Error> {
        let (side, line_num) = match (line.old_lineno(), line.new_lineno()) {
            (Some(_), Some(_)) => {
                if line.origin() == ' ' {
                    return Err(());
                }
                panic!("line with double change")
            }
            (Some(line), None) => (Side::OldFile, line),
            (None, Some(line)) => (Side::NewFile, line),
            _ => {
                panic!("line with no change")
            }
        };
        Ok(Change {
            side,
            line_num,
            change_type: line.origin(),
        })
    }
}

#[derive(Serialize, Deserialize)]
pub enum Side {
    OldFile,
    NewFile,
}

#[time]
#[tauri::command(async)]
pub fn get_diff(path: String, delta: Delta) -> Result<DeltaDiff, GitError> {
    let repo = Repository::open(path.clone())?;

    let (old_file, new_file) = delta.change.get_files();

    let old_blob = old_file.and_then(|file| get_file_blob(&repo, &path, &file));
    let new_blob = new_file.and_then(|file| get_file_blob(&repo, &path, &file));

    let old_content = old_blob
        .as_ref()
        .map(|blob| String::from_utf8_lossy(blob.content()).to_string());
    let new_content = new_blob
        .as_ref()
        .map(|blob| String::from_utf8_lossy(blob.content()).to_string());

    let mut hunks = vec![];
    let mut hunk_changes: HashMap<String, Vec<Change>> = HashMap::new();

    let mut options = DiffOptions::default();
    options.show_binary(true);

    repo.diff_blobs(
        old_blob.as_ref(),
        None,
        new_blob.as_ref(),
        None,
        Some(&mut options),
        None,
        Some(&mut |_, _binary| {
            todo!("Binary diff");
        }),
        Some(&mut |_, hunk| {
            hunks.push(Hunk::from(hunk));
            true
        }),
        Some(&mut |_, hunk, line| {
            let hunk_name = std::str::from_utf8(hunk.unwrap().header())
                .unwrap()
                .to_owned();
            if !hunk_changes.contains_key(&hunk_name) {
                hunk_changes.insert(hunk_name.clone(), vec![]);
            }
            if let Ok(change) = Change::try_from(line) {
                hunk_changes.get_mut(&hunk_name).unwrap().push(change);
            }
            true
        }),
    )?;

    for hunk in &mut hunks {
        hunk.changes = hunk_changes.remove(&hunk.header).unwrap_or(vec![]);
    }

    Ok(DeltaDiff {
        old_file: old_content,
        new_file: new_content,
        hunks,
    })
}

pub fn get_file_blob<'a>(repo: &'a Repository, path: &str, file: &File) -> Option<Blob<'a>> {
    let path = Path::new(path);

    Oid::from_str(&file.id).ok().and_then(|oid| {
        if oid.is_zero() {
            PathBuf::from_str(&file.path)
                .ok()
                .and_then(|file_path| {
                    let absolute_path = path.join(file_path);
                    repo.blob_path(&absolute_path).ok()
                })
                .and_then(|oid| repo.find_blob(oid).ok())
        } else {
            repo.find_blob(oid).ok()
        }
    })
}
