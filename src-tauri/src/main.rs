#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod http_server;
mod positioned_commit;
mod settings;

use crate::commands::{
    checkout_commit, checkout_local, checkout_remote, commit, fetch, get_commit, get_commits,
    get_diff, get_diff_settings, get_last_repo, get_refs, get_working_dir, open_repo,
    set_diff_settings, stage, stage_hunk, stage_line, stop_watch_repo, unstage, unstage_hunk,
    watch_repo,
};
use crate::http_server::get_port;
use env_logger::Env;
use http_server::launch_server;
use notify::RecommendedWatcher;
use std::{sync::Mutex, thread};
use tauri::{CustomMenuItem, Manager, Menu, Submenu};

extern crate rocket;

#[derive(Default)]
pub struct AppState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    port: u16,
}

fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("debug")).init();

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            checkout_commit,
            checkout_local,
            checkout_remote,
            commit,
            fetch,
            get_commit,
            get_commits,
            get_diff,
            get_last_repo,
            get_port,
            get_refs,
            get_working_dir,
            get_diff_settings,
            set_diff_settings,
            open_repo,
            // something something
            stage,
            stage_hunk,
            stage_line,
            stop_watch_repo,
            unstage,
            unstage_hunk,
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
        .setup(|app| {
            let mut app_state = AppState::default();
            app_state.port = launch_server();
            println!("App set up {}", app_state.port);
            app.manage(app_state);

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_, _| {});
}
