use std::collections::HashMap;

use crate::commands::serializer::delta::Delta;
use git2::{DiffHunk, DiffLine, Oid, Repository};
use logging_timer::time;
use serde::Serialize;

use super::serializer::{delta::FileChange, git_error::GitError};

#[derive(Serialize)]
pub struct DeltaDiff {
    old_file: Option<String>,
    new_file: Option<String>,
    hunks: Vec<Hunk>,
}

#[derive(Serialize)]
pub struct Hunk {
    old_range: (u32, u32),
    new_range: (u32, u32),
    header: String,
    changes: Vec<Change>,
}

impl<'a> From<DiffHunk<'a>> for Hunk {
    fn from(hunk: DiffHunk) -> Self {
        Hunk {
            old_range: (hunk.old_start(), hunk.old_lines()),
            new_range: (hunk.new_start(), hunk.new_lines()),
            header: std::str::from_utf8(hunk.header()).unwrap().to_owned(),
            changes: vec![],
        }
    }
}

#[derive(Serialize)]
pub struct Change {
    side: Side,
    line_num: u32,
    change_type: char,
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

#[derive(Serialize)]
pub enum Side {
    OldFile,
    NewFile,
}

#[time]
#[tauri::command(async)]
pub fn get_diff(path: String, delta: Delta) -> Result<DeltaDiff, GitError> {
    let repo = Repository::open(path)?;

    let (old_file, new_file) = match delta.change {
        FileChange::Added(new) => (None, Some(new)),
        FileChange::Untracked(new) => (None, Some(new)),
        FileChange::Copied(old, new) => (Some(old), Some(new)),
        FileChange::Deleted(old) => (Some(old), None),
        FileChange::Renamed(old, new) => (Some(old), Some(new)),
        FileChange::Modified(old, new) => (Some(old), Some(new)),
    };

    let old_blob = old_file
        .and_then(|file| Oid::from_str(&file.id).ok())
        .and_then(|id| repo.find_blob(id).ok());
    let new_blob = new_file
        .and_then(|file| Oid::from_str(&file.id).ok())
        .and_then(|id| repo.find_blob(id).ok());

    let old_content = old_blob.as_ref().and_then(|blob| {
        // TODO Case it's not utf_8? is it posible?
        std::str::from_utf8(blob.content())
            .ok()
            .map(|v| v.to_owned())
    });
    let new_content = new_blob.as_ref().and_then(|blob| {
        std::str::from_utf8(blob.content())
            .ok()
            .map(|v| v.to_owned())
    });

    let mut hunks = vec![];
    let mut hunk_changes: HashMap<String, Vec<Change>> = HashMap::new();

    repo.diff_blobs(
        old_blob.as_ref(),
        None,
        new_blob.as_ref(),
        None,
        None,
        Some(&mut |_, _| true),
        Some(&mut |_, _binary| todo!("Binary diff")),
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
