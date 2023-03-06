use std::path::Path;

use notify::{recommended_watcher, RecursiveMode, Watcher};

#[tauri::command]
pub fn watch_repo(path: String) {
    let mut watcher = recommended_watcher(|res| {
        println!("{:?}", res);
    })
    .unwrap();

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .unwrap();
    println!("Watching {}", path);
}
