use crate::commands::get_path_filename;
use crate::AppState;

#[tauri::command]
pub fn get_repo_name(state: tauri::State<'_, AppState>) -> Option<String> {
    state.repository.lock().ok().and_then(|mutex_repo| {
        return mutex_repo
            .as_ref()
            .map(|(_, path)| get_path_filename(path).to_owned());
    })
}
