use git2::{Branch, BranchType, Repository};
use itertools::Itertools;
use logging_timer::time;
use serde::Serialize;

use super::serializer::git_error::GitError;

#[derive(Debug, Serialize)]
pub struct LocalRef {
    id: String,
    name: String,
    is_head: bool,
}

pub enum ParseRefError {
    NoRef,
    NoRemote,
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

        let (remote, name) = name
            .splitn(2, "/")
            .map(|v| v.to_owned())
            .collect_tuple()
            .ok_or(ParseRefError::NoRemote)?;

        Ok(RemoteRef {
            id: branch
                .get()
                .target()
                .ok_or(ParseRefError::NoRef)?
                .to_string(),
            remote,
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

#[time]
#[tauri::command(async)]
pub fn get_refs(path: String) -> Result<Vec<Ref>, GitError> {
    let repo = Repository::open(path)?;

    // TODO get orphan branch
    let head_option = repo
        .head()
        .and_then(|head| head.resolve())
        .ok()
        .and_then(|reference| reference.target())
        .map(|oid| Ref::Head(oid.to_string()));

    let mut list = if let Some(head) = head_option {
        vec![head]
    } else {
        vec![]
    };

    let branches = repo
        .branches(None)?
        .filter_map(|result| result.ok().and_then(|branch| Ref::try_from(branch).ok()));

    list.extend(branches);

    let tags = get_tags(&repo)?;
    let tags = tags.iter().map(|(oid, name)| {
        Ref::Tag(LocalRef {
            id: oid.to_string(),
            name: name.clone(),
            is_head: false,
        })
    });

    list.extend(tags);

    Ok(list)
}

fn get_tags(repo: &Repository) -> Result<Vec<(git2::Oid, String)>, git2::Error> {
    let mut tags = vec![];

    repo.tag_foreach(|id, u8| {
        let ref_name = String::from_utf8_lossy(u8).to_string();
        let split = ref_name
            .splitn(3, "/")
            .collect_tuple()
            .map(|(_, _, name)| name.to_owned());
        if let Some(name) = split {
            tags.push((id, name));
        }
        true
    })?;

    Ok(tags)
}
