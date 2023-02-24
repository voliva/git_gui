#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use git2::Repository;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::{mpsc, Mutex, PoisonError};
use tauri::api::path;
use tauri::App;
use tauri::{api::dialog::FileDialogBuilder, Manager};

struct AppState {
    repository: Mutex<Option<(Repository, String)>>,
}

#[derive(Serialize)]
enum OpenRepoError {
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

#[tauri::command]
fn get_repo_name(state: tauri::State<'_, AppState>) -> Option<String> {
    state.repository.lock().ok().and_then(|mutex_repo| {
        return mutex_repo.as_ref().map(|(_, name)| name.clone());
    })
}

#[tauri::command(async)]
fn open_repo(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, OpenRepoError> {
    let (sx, rx) = mpsc::channel();
    FileDialogBuilder::new().pick_folder(move |path| sx.send(path).unwrap_or(()));
    let result = rx.recv();

    if let Ok(Some(path)) = result {
        let name = path
            .file_name()
            .map(|v| v.to_str().unwrap_or(""))
            .unwrap_or("")
            .to_owned();
        let path = match path.to_str() {
            Some(p) => p.to_owned(),
            None => {
                return Err(OpenRepoError::NoSelection);
            }
        };

        let new_repo = Repository::open(path.clone())?;
        set_settings_opened_repo(&app, &path);

        let mut mutex_repo = state.repository.lock()?;
        *mutex_repo = Some((new_repo, name.clone()));

        return Ok(name);
    } else {
        return Err(OpenRepoError::NoSelection);
    }
}

fn main() {
    // tauri::api::path::app_local_data_dir();
    // tauri::api::file::read_string(file)

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_repo, get_repo_name])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    let repository = get_settings_opened_repo(&app).and_then(|path| {
        Repository::open(&path).ok().map(|repo| {
            let path = PathBuf::from_str(&path).unwrap();
            let name = path
                .file_name()
                .map(|v| v.to_str().unwrap_or(""))
                .unwrap_or("")
                .to_owned();
            (repo, name)
        })
    });

    app.manage(AppState {
        repository: Mutex::new(repository),
    });

    app.run(|_, _| {});
}

fn get_settings_opened_repo(app: &App) -> Option<String> {
    path::app_local_data_dir(&app.config())
        .map(|path| path.join("openrepo"))
        .and_then(|path| match fs::read_to_string(path) {
            Ok(str) => Some(str),
            Err(e) => {
                println!("Error reading opened repo {:?}", e);
                None
            }
        })
}

fn set_settings_opened_repo(app: &tauri::AppHandle, repo: &str) {
    path::app_local_data_dir(&app.config())
        .and_then(|path| {
            if let Err(e) = fs::create_dir_all(&path) {
                println!("Error creating settings dir {:?}", e);
                return None;
            }
            Some(path.join("openrepo"))
        })
        .map(|path| match fs::write(path.clone(), repo) {
            Ok(_) => (),
            Err(e) => {
                println!("Error saving opened repo {:?} {:?}", path, e);
                ()
            }
        });
}
