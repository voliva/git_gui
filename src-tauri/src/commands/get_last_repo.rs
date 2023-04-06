use crate::settings::{OpenRepo, StringSettings};
use git2::Repository;
use logging_timer::time;

#[time]
#[tauri::command(async)]
pub fn get_last_repo(app: tauri::AppHandle) -> Option<String> {
    OpenRepo::load(&app).and_then(|path| Repository::open(&path).ok().map(|_| path))
}
