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
use tauri::{CustomMenuItem, Manager, Menu, Submenu};

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
        .menu(
            Menu::new().add_submenu(Submenu::new(
                "File",
                Menu::new()
                    .add_item(CustomMenuItem::new("open".to_string(), "Open"))
                    .add_item(CustomMenuItem::new("close".to_string(), "Close")),
            )),
        )
        .on_menu_event(|event| match event.menu_item_id() {
            "open" => {
                let app_handle = event.window().app_handle();
                let state = app_handle.state();
                let app_handle = event.window().app_handle();
                open_repo(state, app_handle).ok();
            }
            "close" => {
                std::process::exit(0);
            }
            _ => {}
        })
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
