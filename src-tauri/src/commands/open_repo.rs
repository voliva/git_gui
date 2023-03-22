use crate::settings::set_settings_opened_repo;
use git2::Repository;
use logging_timer::time;
use serde::Serialize;
use std::sync::mpsc;
use tauri::api::dialog::FileDialogBuilder;

#[derive(Serialize)]
pub enum OpenRepoError {
    NoSelection,
    Read(String),
}

impl From<git2::Error> for OpenRepoError {
    fn from(value: git2::Error) -> Self {
        OpenRepoError::Read(value.message().to_owned())
    }
}

#[time]
#[tauri::command(async)]
pub fn open_repo(app: tauri::AppHandle) -> Result<String, OpenRepoError> {
    let (sx, rx) = mpsc::channel();
    println!("Call dialog builder");
    FileDialogBuilder::new().pick_folder(move |path| sx.send(path).unwrap_or(()));
    let result = rx.recv();

    if let Ok(Some(path)) = result {
        let path = match path.to_str() {
            Some(p) => p.to_owned(),
            None => {
                return Err(OpenRepoError::NoSelection);
            }
        };

        Repository::open(path.clone())?;
        set_settings_opened_repo(&app, &path);

        return Ok(path);
    } else {
        return Err(OpenRepoError::NoSelection);
    }
}
