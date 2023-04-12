use std::{
    path::{Path, PathBuf},
    str::FromStr,
};

use crate::commands::serializer::delta::{Delta, File};
use git2::{Blob, DiffHunk, DiffOptions, Oid, Repository};
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
}

impl<'a> From<DiffHunk<'a>> for Hunk {
    fn from(hunk: DiffHunk) -> Self {
        Hunk {
            old_range: (hunk.old_start(), hunk.old_lines()),
            new_range: (hunk.new_start(), hunk.new_lines()),
            header: std::str::from_utf8(hunk.header()).unwrap().to_owned(),
        }
    }
}

#[time]
#[tauri::command(async)]
pub fn get_diff(path: String, delta: Delta) -> Result<DeltaDiff, GitError> {
    let repo = Repository::open(path.clone())?;

    let (old_file, new_file) = match delta.change {
        FileChange::Added(new) => (None, Some(new)),
        FileChange::Untracked(new) => (None, Some(new)),
        FileChange::Copied(old, new) => (Some(old), Some(new)),
        FileChange::Deleted(old) => (Some(old), None),
        FileChange::Renamed(old, new) => (Some(old), Some(new)),
        FileChange::Modified(old, new) => (Some(old), Some(new)),
    };

    let old_blob = old_file.and_then(|file| get_file_blob(&repo, &path, &file));
    let new_blob = new_file.and_then(|file| get_file_blob(&repo, &path, &file));

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
        None,
    )?;

    Ok(DeltaDiff {
        old_file: old_content,
        new_file: new_content,
        hunks,
    })
}

fn get_file_blob<'a>(repo: &'a Repository, path: &str, file: &File) -> Option<Blob<'a>> {
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
