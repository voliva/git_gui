use std::{
    fs::File,
    io::Write,
    path::{Path, PathBuf},
};

use super::{
    get_file_blob,
    serializer::delta::{Delta, FileChange},
    Hunk,
};
use git2::{DiffOptions, ErrorCode, Index, IndexAddOption, Repository};
use itertools::Itertools;
use logging_timer::time;
use serde::{Deserialize, Serialize};

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

#[time]
#[tauri::command(async)]
pub fn stage_hunk(path: String, delta: Delta, hunk: Hunk) -> Result<(), StageError> {
    let patch_file = generate_patch_file(&path, delta, hunk, false)?;
    // let mut f = File::create("patchfile.patch").unwrap();
    // f.write(patch_file.as_slice()).unwrap();

    let diff = git2::Diff::from_buffer(patch_file.as_slice())?;

    let repo = Repository::open(path)?;
    repo.apply(&diff, git2::ApplyLocation::Index, None)?;

    Ok(())
}

#[time]
#[tauri::command(async)]
pub fn unstage_hunk(path: String, delta: Delta, hunk: Hunk) -> Result<(), StageError> {
    let patch_file = generate_patch_file(&path, delta, hunk, true)?;
    let diff = git2::Diff::from_buffer(&patch_file[..])?;

    let repo = Repository::open(path)?;
    repo.apply(&diff, git2::ApplyLocation::Index, None)?;

    Ok(())
}

fn generate_patch_file(
    path: &str,
    delta: Delta,
    hunk: Hunk,
    revert: bool,
) -> Result<Vec<u8>, StageError> {
    let repo = Repository::open(path.to_owned())?;

    let (old_file, new_file) = match delta.change {
        // FileChange::Untracked(f) => add_from_working_dir(&repo, Some(&f.path)),
        // FileChange::Renamed(old, new) => {
        //     remove_from_index(&repo, &old.path)?;
        //     add_from_working_dir(&repo, Some(&new.path))
        // }
        FileChange::Modified(old, new) => (old, new),
        v => unreachable!("unreachable {:?}", v),
    };

    let (old_start, old_length) = hunk.old_range;
    let (new_start, new_length) = hunk.new_range;
    let hunk_start = if revert { new_start } else { old_start };
    let hunk_old_length = if revert { new_length } else { old_length };
    let hunk_new_length = if revert { old_length } else { new_length };
    let mut lines = vec![
        format!("diff --git a/{} b/{}\n", old_file.path, new_file.path)
            .as_bytes()
            .to_owned(),
        format!("--- a/{}\n", old_file.path).as_bytes().to_owned(),
        format!("+++ b/{}\n", new_file.path).as_bytes().to_owned(),
        // We can't use the pre-existing hunk.header because we're only changing the selected one. `hunk.header` can have the rows shifted with previous hunks.
        format!(
            "@@ -{},{} +{},{} @@\n",
            hunk_start, hunk_old_length, hunk_start, hunk_new_length
        )
        .as_bytes()
        .to_owned(),
    ];

    let old_blob = get_file_blob(&repo, path, &old_file);
    let new_blob = get_file_blob(&repo, path, &new_file);

    let mut options = DiffOptions::default();
    // let mut other_hunk_changes: isize = 0;
    // let mut found_hunk = false;

    repo.diff_blobs(
        old_blob.as_ref(),
        None,
        new_blob.as_ref(),
        None,
        Some(&mut options),
        None,
        None,
        None,
        // Some(&mut |_, diff_hunk| {
        //     if found_hunk {
        //         return false
        //     }
        //     if (diff_hunk.old_start(), diff_hunk.old_lines()) == hunk.old_range {
        //         found_hunk = true;
        //     } else {
        //         other_hunk_changes += diff_hunk.new_lines()
        //     }
        //     return true
        // }),
        Some(&mut |_, diff_hunk, line| {
            if let Some(diff_hunk) = diff_hunk {
                if (diff_hunk.old_start(), diff_hunk.old_lines()) == hunk.old_range {
                    let line_origin = if revert {
                        revert_origin(line.origin())
                    } else {
                        line.origin()
                    };
                    let origin = format!("{}", line_origin).as_bytes().to_owned();

                    lines.push(
                        origin
                            .into_iter()
                            .chain(line.content().to_owned().into_iter())
                            .collect(),
                    );
                }
            }
            return true;
        }),
    )?;

    Ok(lines.join(&[] as &[u8]))
}

fn revert_origin(origin: char) -> char {
    match origin {
        '+' => '-',
        '-' => '+',
        '>' => '<',
        '<' => '>',
        c => c,
    }
}

#[derive(Deserialize)]
pub enum LineChange {
    Add { after: usize, content: String },
    Remove(usize),
}

#[time]
#[tauri::command(async)]
pub fn stage_line(path: String, delta: Delta, change: LineChange) -> Result<(), StageError> {
    let repo = Repository::open(path.clone())?;
    let target_idx = match change {
        LineChange::Add { after, content: _ } => after,
        LineChange::Remove(line) => line - 1,
    };

    let file = delta.change.get_oldest_file();
    let blob = get_file_blob(&repo, &path, file).unwrap();
    let data = blob
        .content()
        .split(|v| *v == '\n' as u8)
        .enumerate()
        .flat_map(|(line_idx, line)| {
            if line_idx == target_idx {
                return match &change {
                    LineChange::Add { after: _, content } => vec![content
                        .as_bytes()
                        .iter()
                        .chain(line.iter())
                        .map(|v| *v)
                        .collect_vec()],
                    LineChange::Remove(_) => vec![],
                };
            }
            return vec![line.into()];
        })
        .collect_vec()
        .join(&['\n' as u8] as &[u8]);

    // Should be the same format as
    // let diff = repo.diff_index_to_workdir(None, None)?;
    // diff.print(git2::DiffFormat::Patch, |_, _, line| {
    //     print!("{}", std::str::from_utf8(line.content())?);
    //     true
    // });

    let mut index = repo.index()?;
    let entry = index.get_path(Path::new(&file.path), 0).unwrap();

    index.add_frombuffer(&entry, &data[..])?;
    index.write()?;

    Ok(())
}

// unstage_line is the opposite of stage_line
