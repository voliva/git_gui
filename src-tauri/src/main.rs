#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod positioned_commit;
mod settings;

use crate::commands::{get_commits, get_last_repo, open_repo};
use tauri::{CustomMenuItem, Manager, Menu, Submenu};

pub struct AppState {}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_repo,
            get_last_repo,
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
                if let Ok(path) = open_repo(event.window().app_handle()) {
                    event
                        .window()
                        .app_handle()
                        .emit_all("repo_change", path)
                        .ok();
                }
            }
            "close" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_, _| {});
}
