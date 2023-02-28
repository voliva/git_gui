use crate::{settings::set_settings_opened_repo, AppState};
use git2::Repository;
use serde::Serialize;
use std::{
    path::Path,
    sync::{mpsc, PoisonError},
};
use tauri::api::dialog::FileDialogBuilder;

#[derive(Serialize)]
pub enum OpenRepoError {
    NoSelection,
    ConcurrentError,
    Read(String),
}

impl<T> From<PoisonError<T>> for OpenRepoError {
    fn from(_: PoisonError<T>) -> Self {
        OpenRepoError::ConcurrentError
    }
}

impl From<git2::Error> for OpenRepoError {
    fn from(value: git2::Error) -> Self {
        OpenRepoError::Read(value.message().to_owned())
    }
}

#[tauri::command(async)]
pub fn open_repo(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, OpenRepoError> {
    let (sx, rx) = mpsc::channel();
    FileDialogBuilder::new().pick_folder(move |path| sx.send(path).unwrap_or(()));
    let result = rx.recv();

    if let Ok(Some(path)) = result {
        let path = match path.to_str() {
            Some(p) => p.to_owned(),
            None => {
                return Err(OpenRepoError::NoSelection);
            }
        };

        let name = get_path_filename(&path).to_owned();

        let new_repo = Repository::open(path.clone())?;
        set_settings_opened_repo(&app, &path);

        let mut mutex_repo = state.repository.lock()?;
        *mutex_repo = Some((new_repo, path));

        return Ok(name);
    } else {
        return Err(OpenRepoError::NoSelection);
    }
}

pub fn get_path_filename(path: &str) -> &str {
    let path = Path::new(path);
    path.file_name().unwrap().to_str().unwrap()
}
