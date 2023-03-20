#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod positioned_commit;
mod settings;
mod timer;

use crate::commands::{
    checkout_commit, checkout_ref, commit, fetch, get_commit, get_commits, get_last_repo, get_refs,
    get_working_dir, open_repo, stage, stop_watch_repo, unstage, watch_repo,
};
use notify::RecommendedWatcher;
use std::{sync::Mutex, thread};
use tauri::{CustomMenuItem, Manager, Menu, Submenu};

#[derive(Default)]
pub struct AppState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            checkout_commit,
            checkout_ref,
            commit,
            fetch,
            get_commit,
            get_commits,
            get_last_repo,
            get_refs,
            get_working_dir,
            open_repo,
            stage,
            stop_watch_repo,
            unstage,
            watch_repo
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
                thread::spawn(move || {
                    if let Ok(path) = open_repo(event.window().app_handle()) {
                        event
                            .window()
                            .app_handle()
                            .emit_all("repo_change", path)
                            .ok();
                    }
                });
            }
            "close" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");
    app.manage(AppState::default());

    app.run(|_, _| {});
}
