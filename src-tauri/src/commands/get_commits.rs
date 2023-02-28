use crate::{
    positioned_commit::{get_positioned_commits, PositionedCommit},
    AppState,
};
use serde::Serialize;
use std::sync::PoisonError;

#[derive(Serialize)]
pub enum GetCommitsError {
    NotOpen,
    ConcurrentError,
}

impl<T> From<PoisonError<T>> for GetCommitsError {
    fn from(_: PoisonError<T>) -> Self {
        GetCommitsError::ConcurrentError
    }
}

#[tauri::command]
pub fn get_commits(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PositionedCommit>, GetCommitsError> {
    let mutex_repo = state.repository.lock()?;

    mutex_repo
        .as_ref()
        .map(|(repo, _)| get_positioned_commits(repo))
        .ok_or(GetCommitsError::NotOpen)
}
