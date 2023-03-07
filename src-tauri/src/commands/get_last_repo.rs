use crate::settings::get_settings_opened_repo;
use git2::Repository;

#[tauri::command(async)]
pub fn get_last_repo(app: tauri::AppHandle) -> Option<String> {
    get_settings_opened_repo(&app).and_then(|path| Repository::open(&path).ok().map(|_| path))
}
