use rocket::{
    http::Status,
    response::{self, Responder},
    Request,
};
use serde::Serialize;

#[derive(Serialize, Debug)]
pub enum GitError {
    Wrapped(String),
}

impl From<git2::Error> for GitError {
    fn from(value: git2::Error) -> Self {
        GitError::Wrapped(value.message().to_owned())
    }
}

impl<'r, 'o: 'r> Responder<'r, 'o> for GitError {
    fn respond_to(self, req: &'r Request<'_>) -> response::Result<'o> {
        match self {
            _ => Status::InternalServerError.respond_to(req),
        }
    }
}
