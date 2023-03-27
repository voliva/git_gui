use git2::{Repository, StatusOptions};
use logging_timer::time;
use serde::Serialize;

use super::serializer::delta::Delta;

#[time]
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

    /*
         * This is slow on big repos, way slower than `git status` on CLI
         * I might want to do like https://github.com/pnordahl/monorail/blob/f576389ff22e02929ee482605fa0ada01724f026/src/lib.rs#L310
         * Issue https://github.com/libgit2/libgit2/issues/4230
         *
         * Will also have similar problems with git2
         * https://github.com/libgit2/libgit2/issues/3027
         * people keep suggesting running on CLI instead https://github.com/Arrowbox/git-whoknows/issues/2
         *
         * Alternative, also equally slow
    let mut options = DiffOptions::new();
    options.minimal(true);
    // options.include_ignored(false);
    // options.include_untracked(true);

    let head_tree = repo.head()?.peel_to_tree()?;

    let unstaged_diff = repo.diff_index_to_workdir(None, Some(&mut options))?;
    let staged_diff = repo.diff_tree_to_index(Some(&head_tree), None, Some(&mut options));

    Ok(WorkingDirStatus {
        unstaged_deltas: unstaged_diff
            .deltas()
            .map(|delta| delta.try_into().unwrap())
            .collect(),
        staged_deltas: staged_diff
            .deltas()
            .map(|delta| delta.try_into().unwrap())
            .collect(),
    })
         *
         */

    let mut options = StatusOptions::new();
    options.include_ignored(false);
    options.include_untracked(true);
    options.renames_from_rewrites(true);
    options.renames_head_to_index(true);
    options.renames_index_to_workdir(true);

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
