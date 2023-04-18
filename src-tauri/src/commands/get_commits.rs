use std::time::Duration;

use crate::positioned_commit::get_positioned_commits;
use git2::Repository;
use logging_timer::time;
use tauri::Window;

use super::serializer::git_error::GitError;

#[time]
#[tauri::command(async)]
pub fn get_commits(
    path: String,
    correlation_id: String,
    window: Window,
) -> Result<usize, GitError> {
    let repo = Repository::open(path)?;

    let response_channel = format!("get_commits-stream-{correlation_id}");
    let result = get_positioned_commits(&repo)?
        .enumerate()
        .map(|(i, x)| {
            window.emit(&response_channel, &x).ok();
            if i % 50 == 0 {
                std::thread::sleep(Duration::from_millis(20));
            }
            x
        })
        .count();

    Ok(result)
}
