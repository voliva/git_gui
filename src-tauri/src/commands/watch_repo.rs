use super::{read_working_dir, serializer::git_error::GitError};
use crate::AppState;
use log::error;
use logging_timer::time;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    path::Path,
    sync::{mpsc::channel, Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{State, Window};

#[time]
#[tauri::command(async)]
pub fn watch_repo(path: String, state: State<AppState>, window: Window) -> Result<(), GitError> {
    let (tx, rx) = channel();
    let (tx_end, rx_end) = channel();
    let needs_update = Arc::new(Mutex::new(false));

    let mut watcher = RecommendedWatcher::new(tx, Config::default()).map_err(|err| {
        error!("Notifier error: {:?}", err);
        GitError::Wrapped("Couldn't initialize watcher".to_owned())
    })?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|err| {
            error!("Watcher error: {:?}", err);
            GitError::Wrapped("Couldn't initialize watcher".to_owned())
        })?;

    let watcher_nu = needs_update.clone();
    let watcher_wnd = window.clone();
    let watcher_path = path.clone();
    thread::spawn(move || {
        let git_folder = Path::new(&watcher_path).join(".git");

        for msg in rx {
            if let Ok(event) = msg {
                watcher_wnd.emit("watcher_notification", &event).ok();

                // Only notify working_directory changes if the change happens outside the .git folder
                // Or if it happens on the HEAD (after commit) or index (after stage/unstage).
                if event.paths.iter().any(|event_path| {
                    let is_git_folder = event_path.starts_with(&git_folder);
                    let path = event_path.to_str().unwrap_or("");
                    return !is_git_folder
                        || path.ends_with(".git\\logs\\HEAD")
                        || path.ends_with(".git/logs/HEAD")
                        || path.ends_with(".git\\index")
                        || path.ends_with(".git/index");
                }) {
                    watcher_nu
                        .lock()
                        .and_then(|mut nu| {
                            *nu = true;
                            Ok(())
                        })
                        .ok();
                }
            }
        }
        tx_end.send(()).ok();
    });

    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(100));
        let needs_update = needs_update
            .lock()
            .map(|mut nu| {
                let result = bool::clone(&*nu);
                *nu = false;
                return result;
            })
            .unwrap_or(false);

        if needs_update {
            if let Ok(status) = read_working_dir(&path) {
                window.emit("working-directory", &status).ok();
            }
        }

        if let Ok(_) = rx_end.try_recv() {
            break;
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

    Ok(())
}

#[time]
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
