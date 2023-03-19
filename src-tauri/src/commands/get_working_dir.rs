use git2::{Repository, StatusOptions};
use serde::Serialize;

use super::serializer::delta::Delta;

#[tauri::command(async)]
pub fn get_working_dir(path: String) -> Result<WorkingDirStatus, ()> {
    read_working_dir(&path).map_err(|_| ())
}

#[derive(Serialize)]
pub struct WorkingDirStatus {
    unstaged_deltas: Vec<Delta>,
    staged_deltas: Vec<Delta>,
}

pub fn read_working_dir(path: &str) -> Result<WorkingDirStatus, git2::Error> {
    let repo = Repository::open(path)?;

    let mut options = StatusOptions::new();
    options.include_ignored(false);
    options.include_untracked(true);
    options.rename_threshold(std::u16::MAX);

    let mut status = WorkingDirStatus {
        unstaged_deltas: vec![],
        staged_deltas: vec![],
    };

    let statuses = repo.statuses(Some(&mut options))?;
    statuses.iter().for_each(|s| {
        if let Some(diff) = s.head_to_index() {
            status.staged_deltas.push(diff.try_into().unwrap());
        }
        if let Some(diff) = s.index_to_workdir() {
            status.unstaged_deltas.push(diff.try_into().unwrap());
        }
    });

    Ok(status)
}
