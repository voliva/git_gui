use crate::positioned_commit::{get_positioned_commits, PositionedCommit};
use crate::timer::Timer;
use git2::Repository;
use itertools::Itertools;
use serde::Serialize;

#[derive(Serialize)]
pub enum GetCommitsError {
    Read(String),
}

impl From<git2::Error> for GetCommitsError {
    fn from(value: git2::Error) -> Self {
        GetCommitsError::Read(value.message().to_owned())
    }
}

#[tauri::command]
pub fn get_commits(
    path: String,
    amount: Option<usize>,
) -> Result<Vec<PositionedCommit>, GetCommitsError> {
    let repo = Repository::open(path)?;

    let mut timer = Timer::new();
    let result = get_positioned_commits(&repo)
        .take(amount.unwrap_or(usize::MAX))
        .collect_vec();
    println!("get_commits({}) {}", result.len(), timer.lap());

    Ok(result)
}
