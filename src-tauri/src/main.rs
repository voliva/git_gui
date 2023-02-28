#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod positioned_commit;
mod settings;
mod timer;

use crate::commands::{get_commits, get_repo_name, open_repo};
use git2::Repository;
use settings::get_settings_opened_repo;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    repository: Mutex<Option<(Repository, String)>>,
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_repo,
            get_repo_name,
            get_commits
        ])
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
