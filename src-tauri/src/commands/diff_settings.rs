use crate::settings::{DiffSettings, JsonSettingsLoader};
use logging_timer::time;

#[time]
#[tauri::command(async)]
pub fn get_diff_settings(app: tauri::AppHandle) -> Option<DiffSettings> {
    DiffSettings::load(&app)
}

#[time]
#[tauri::command(async)]
pub fn set_diff_settings(app: tauri::AppHandle, settings: DiffSettings) {
    settings.save(&app)
}
