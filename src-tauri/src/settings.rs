use std::fs;
use tauri::api::path;

pub fn get_settings_opened_repo(app: &tauri::AppHandle) -> Option<String> {
    path::app_local_data_dir(&app.config())
        .map(|path| path.join("openrepo"))
        .and_then(|path| match fs::read_to_string(path) {
            Ok(str) => Some(str),
            Err(e) => {
                println!("Error reading opened repo {:?}", e);
                None
            }
        })
}

pub fn set_settings_opened_repo(app: &tauri::AppHandle, repo: &str) {
    path::app_local_data_dir(&app.config())
        .and_then(|path| {
            if let Err(e) = fs::create_dir_all(&path) {
                println!("Error creating settings dir {:?}", e);
                return None;
            }
            Some(path.join("openrepo"))
        })
        .map(|path| match fs::write(path.clone(), repo) {
            Ok(_) => (),
            Err(e) => {
                println!("Error saving opened repo {:?} {:?}", path, e);
                ()
            }
        });
}
