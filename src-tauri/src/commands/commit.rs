use git2::Repository;
use serde::Serialize;

#[derive(Serialize)]
pub enum CommitError {
    Read(String),
}

impl From<git2::Error> for CommitError {
    fn from(value: git2::Error) -> Self {
        CommitError::Read(value.message().to_owned())
    }
}

#[tauri::command(async)]
pub fn commit(path: String, message: String, _amend: bool) -> Result<String, CommitError> {
    let repo = Repository::open(path)?;
    let oid = repo.index()?.write_tree()?;
    let tree = repo.find_tree(oid)?;
    let head_commit = repo.head()?.peel_to_commit().ok();
    let signature = repo.signature()?;

    let oid = if let Some(commit) = head_commit {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[&commit],
        )?
    } else {
        repo.commit(Some("HEAD"), &signature, &signature, &message, &tree, &[])?
    };

    Ok(oid.to_string())
}
