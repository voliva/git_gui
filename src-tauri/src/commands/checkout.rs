use super::serializer::git_error::GitError;
use git2::Repository;

#[tauri::command(async)]
pub fn checkout_commit(path: String, id: String) -> Result<(), GitError> {
    let repo = Repository::open(path)?;

    Ok(())
}

#[tauri::command(async)]
pub fn checkout_ref(path: String, ref_name: String) -> Result<(), GitError> {
    Ok(())
}
