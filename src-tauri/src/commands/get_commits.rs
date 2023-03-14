use crate::positioned_commit::get_positioned_commits;
use crate::timer::Timer;
use git2::Repository;
use serde::Serialize;
use tauri::Window;

#[derive(Serialize)]
pub enum GetCommitsError {
    Read(String),
}

impl From<git2::Error> for GetCommitsError {
    fn from(value: git2::Error) -> Self {
        GetCommitsError::Read(value.message().to_owned())
    }
}

#[tauri::command(async)]
pub fn get_commits(
    path: String,
    correlation_id: String,
    window: Window,
) -> Result<usize, GetCommitsError> {
    let repo = Repository::open(path)?;

    let response_channel = format!("get_commits-stream-{correlation_id}");
    let mut timer = Timer::new();
    let result = get_positioned_commits(&repo)
        .map(|x| {
            window.emit(&response_channel, &x).ok();
            x
        })
        .count();

    println!("get_commits({}) {}", result, timer.lap());

    Ok(result)
}
