use serde::Serialize;

#[derive(Serialize)]
pub enum GitError {
    Wrapped(String),
}

impl From<git2::Error> for GitError {
    fn from(value: git2::Error) -> Self {
        GitError::Wrapped(value.message().to_owned())
    }
}
