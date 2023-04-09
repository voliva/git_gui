#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod positioned_commit;
mod settings;

use crate::commands::{
    checkout_commit, checkout_local, checkout_remote, commit, fetch, get_commit, get_commits,
    get_diff, get_diff_settings, get_last_repo, get_refs, get_working_dir, open_repo,
    set_diff_settings, stage, stop_watch_repo, unstage, watch_repo,
};
use env_logger::Env;
use logging_timer::time;
use notify::RecommendedWatcher;
use port_check::free_local_port;
use std::{sync::Mutex, thread};
use tauri::{CustomMenuItem, Manager, Menu, State, Submenu};
extern crate rocket;

#[derive(Default)]
pub struct AppState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    port: u16,
}

#[rocket::get("/raw/<path>/<id>")]
fn get_raw_file(path: &str, id: &str) -> Vec<u8> {
    let repo = git2::Repository::open(path).unwrap();
    let blob = repo.find_blob(git2::Oid::from_str(id).unwrap()).unwrap();

    blob.content().into()
}

fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("debug")).init();
    let port = free_local_port().unwrap();
    let mut app_state = AppState::default();
    app_state.port = port;

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
        .setup(move |_| {
            let mut config = rocket::config::Config::default();
            config.port = port.clone();

            let cors = CorsOptions::default()
                .allowed_origins(AllowedOrigins::all())
                .allowed_methods(
                    vec![Method::Get, Method::Post, Method::Patch]
                        .into_iter()
                        .map(From::from)
                        .collect(),
                )
                .allow_credentials(true);

            tauri::async_runtime::spawn(
                rocket::build()
                    .configure(config)
                    .mount("/", rocket::routes![get_raw_file])
                    .launch(),
            );
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");
    app.manage(app_state);

    app.run(|_, _| {});
}

#[time]
#[tauri::command]
fn get_port(state: State<AppState>) -> u16 {
    state.port
}
