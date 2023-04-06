use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fs;
use tauri::api::path;

/// Opened Repo ///
pub struct OpenRepo {}
impl StringSettings for OpenRepo {
    fn get_filename() -> &'static str {
        "openrepo"
    }
}

/// Diff Settings ///
#[derive(Serialize, Deserialize)]
pub enum HunkOrFile {
    Hunk,
    File,
}

#[derive(Serialize, Deserialize)]
pub enum SplitOrUnified {
    Split,
    Unified,
}

#[derive(Serialize, Deserialize)]
pub struct DiffSettings {
    hunk_or_file: HunkOrFile,
    split_or_unified: SplitOrUnified,
}
impl JsonSettings for DiffSettings {
    fn get_filename() -> &'static str {
        "diffsettings"
    }
}

/// Generics ///
trait JsonSettings {
    fn get_filename() -> &'static str;
}
pub trait JsonSettingsLoader<T> {
    fn load(app: &tauri::AppHandle) -> Option<T>;
    fn save(&self, app: &tauri::AppHandle);
}
impl<T: DeserializeOwned + Serialize + JsonSettings> JsonSettingsLoader<T> for T {
    fn load(app: &tauri::AppHandle) -> Option<T> {
        get_json_settings(app, Self::get_filename())
    }

    fn save(&self, app: &tauri::AppHandle) {
        set_json_settings(app, Self::get_filename(), self);
    }
}

pub trait StringSettings {
    fn get_filename() -> &'static str;

    fn load(app: &tauri::AppHandle) -> Option<String> {
        get_settings(app, Self::get_filename())
    }
    fn save(app: &tauri::AppHandle, value: &str) {
        set_settings(app, Self::get_filename(), value)
    }
}

fn get_settings(app: &tauri::AppHandle, filename: &str) -> Option<String> {
    path::app_local_data_dir(&app.config())
        .map(|path| path.join(filename))
        .and_then(|path| match fs::read_to_string(path) {
            Ok(str) => Some(str),
            Err(e) => {
                println!("Error reading settings {} {:?}", filename, e);
                None
            }
        })
}

fn get_json_settings<T: DeserializeOwned>(app: &tauri::AppHandle, filename: &str) -> Option<T> {
    get_settings(app, filename).and_then(|str| match serde_json::from_str(&str) {
        Ok(v) => Some(v),
        Err(e) => {
            println!("Error reading serialized {} {:?}", filename, e);
            None
        }
    })
}

fn set_settings(app: &tauri::AppHandle, filename: &str, settings: &str) {
    path::app_local_data_dir(&app.config())
        .and_then(|path| {
            if let Err(e) = fs::create_dir_all(&path) {
                println!("Error creating settings dir {:?}", e);
                return None;
            }
            Some(path.join(filename))
        })
        .map(|path| match fs::write(path.clone(), settings) {
            Ok(_) => (),
            Err(e) => {
                println!("Error saving settings {:?} {:?}", path, e);
                ()
            }
        });
}
fn set_json_settings<T: Serialize>(app: &tauri::AppHandle, filename: &str, settings: T) {
    let json = match serde_json::to_string(&settings) {
        Ok(v) => Some(v),
        Err(e) => {
            println!("Error serializing settings {} {:?}", filename, e);
            None
        }
    };

    json.map(|json| set_settings(app, filename, &json));
}
