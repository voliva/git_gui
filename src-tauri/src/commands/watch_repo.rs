use std::{path::Path, sync::mpsc::channel, thread};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{State, Window};

use crate::AppState;

#[tauri::command(async)]
pub fn watch_repo(path: String, state: State<AppState>, window: Window) {
    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(tx, Config::default()).unwrap();

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .unwrap();

    thread::spawn(move || {
        for msg in rx {
            if let Ok(event) = msg {
                window.emit("watcher_notification", &event).ok();
            }
        }
    });

    state
        .watcher
        .lock()
        .and_then(move |mut watcher_mutex| {
            *watcher_mutex = Some(watcher);
            Ok(())
        })
        .ok();
}

#[tauri::command(async)]
pub fn stop_watch_repo(state: State<AppState>) {
    state
        .watcher
        .lock()
        .and_then(|mut watcher_mutex| {
            *watcher_mutex = None;
            Ok(())
        })
        .ok();
}
