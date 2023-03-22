use git2::Repository;
use logging_timer::time;
use serde::Serialize;

#[derive(Serialize)]
pub enum CommitError {
    Read(String),
    NeedCommitToAmend,
}

impl From<git2::Error> for CommitError {
    fn from(value: git2::Error) -> Self {
        CommitError::Read(value.message().to_owned())
    }
}

#[time]
#[tauri::command(async)]
pub fn commit(path: String, message: String, amend: bool) -> Result<String, CommitError> {
    let repo = Repository::open(path)?;
    let oid = repo.index()?.write_tree()?;
    let tree = repo.find_tree(oid)?;
    let head_commit = repo.head().and_then(|head| head.peel_to_commit()).ok();
    let signature = repo.signature()?;

    if amend {
        let head_commit = head_commit.ok_or(CommitError::NeedCommitToAmend)?;

        let oid = head_commit.amend(
            Some("HEAD"),
            Some(&signature),
            Some(&signature),
            None,
            Some(&message),
            Some(&tree),
        )?;

        Ok(oid.to_string())
    } else {
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
}
