use git2::{Branch, BranchType, Repository};
use itertools::Itertools;
use serde::Serialize;

use crate::timer::Timer;

#[derive(Serialize)]
pub enum GetRefsError {
    Read(String),
}

impl From<git2::Error> for GetRefsError {
    fn from(value: git2::Error) -> Self {
        GetRefsError::Read(value.message().to_owned())
    }
}

#[derive(Debug, Serialize)]
pub struct LocalRef {
    id: String,
    name: String,
    is_head: bool,
}

pub enum ParseRefError {
    NoRef,
    Git2Error(git2::Error),
    InvalidUTF8,
}
impl From<git2::Error> for ParseRefError {
    fn from(error: git2::Error) -> Self {
        ParseRefError::Git2Error(error)
    }
}
impl TryFrom<Branch<'_>> for LocalRef {
    type Error = ParseRefError;

    fn try_from(branch: Branch<'_>) -> Result<Self, Self::Error> {
        Ok(LocalRef {
            id: branch
                .get()
                .target()
                .ok_or(ParseRefError::NoRef)?
                .to_string(),
            name: branch.name()?.ok_or(ParseRefError::InvalidUTF8)?.to_owned(),
            is_head: branch.is_head(),
        })
    }
}

#[derive(Debug, Serialize)]
pub struct RemoteRef {
    id: String,
    remote: String,
    name: String,
}

impl TryFrom<Branch<'_>> for RemoteRef {
    type Error = ParseRefError;

    fn try_from(branch: Branch<'_>) -> Result<Self, Self::Error> {
        let name = branch.name()?.ok_or(ParseRefError::InvalidUTF8)?.to_owned();

        Ok(RemoteRef {
            id: branch
                .get()
                .target()
                .ok_or(ParseRefError::NoRef)?
                .to_string(),
            remote: String::new(),
            name,
        })
    }
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum Ref {
    Head(String),
    LocalBranch(LocalRef),
    RemoteBranch(RemoteRef),
    Tag(LocalRef),
}

impl TryFrom<(Branch<'_>, BranchType)> for Ref {
    type Error = ParseRefError;

    fn try_from((branch, branch_type): (Branch<'_>, BranchType)) -> Result<Self, Self::Error> {
        Ok(match branch_type {
            BranchType::Local => Ref::LocalBranch(branch.try_into()?),
            BranchType::Remote => Ref::RemoteBranch(branch.try_into()?),
        })
    }
}

#[tauri::command(async)]
pub fn get_refs(path: String) -> Result<Vec<Ref>, GetRefsError> {
    let mut timer = Timer::new();
    let repo = Repository::open(path)?;

    let head = repo
        .head()?
        .resolve()?
        .target()
        .map(|oid| Ref::Head(oid.to_string()));

    let branches = repo
        .branches(None)?
        .filter_map(|result| result.ok().and_then(|branch| Ref::try_from(branch).ok()));

    let tags = get_tags(&repo)?;
    let tags = tags.iter().filter_map(|tag| {
        let name = tag.name().map(|name| name.to_owned());
        let commit_id = tag
            .peel()
            .ok()
            .and_then(|obj| obj.as_commit().map(|commit| commit.id().to_string()));

        name.zip(commit_id).map(|(name, id)| {
            Ref::Tag(LocalRef {
                id,
                name,
                is_head: false,
            })
        })
    });

    let mut list = branches.chain(tags).collect_vec();
    if let Some(head) = head {
        list.push(head);
    }

    println!("get_refs: {}", timer.lap());

    Ok(list)
}

fn get_tags(repo: &Repository) -> Result<Vec<git2::Tag>, git2::Error> {
    let mut tags = vec![];

    repo.tag_foreach(|id, _| {
        if let Ok(tag) = repo.find_tag(id) {
            tags.push(tag);
        }
        true
    })?;

    Ok(tags)
}
