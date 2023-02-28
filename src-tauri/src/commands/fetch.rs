use crate::AppState;
use git2::Repository;

#[tauri::command(async)]
pub fn fetch(state: tauri::State<'_, AppState>) -> Result<(), ()> {
    // Fetch is an operation that takes long, since it fetches from all origin and all branches.
    // Instead of keeping the AppState locked forever, we just grab the path and create a new Repo object.
    let path = state
        .repository
        .lock()
        .ok()
        .and_then(|mutex_repo| {
            return mutex_repo.as_ref().map(|(_, path)| path.clone());
        })
        .unwrap();

    let fetchRepo = Repository::open(path);

    Ok(())
}
