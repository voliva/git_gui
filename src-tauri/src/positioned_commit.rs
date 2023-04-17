use std::collections::HashMap;

use git2::{Commit, Error, Oid, Repository, Revwalk, Signature, Sort};
use itertools::Itertools;
use memoize::memoize;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SignatureInfo {
    pub name: Option<String>,
    pub email: Option<String>,
    pub hash: Option<String>,
    pub time: i64,
}

#[memoize]
fn get_md5_string<'a>(data: String) -> String {
    format!("{:?}", md5::compute(data))
}

impl SignatureInfo {
    pub fn new(signature: &Signature) -> Self {
        SignatureInfo {
            name: signature.name().map(|v| v.to_owned()),
            email: signature.email().map(|v| v.to_owned()),
            hash: signature.email().map(|v| get_md5_string(v.to_owned())),
            time: signature.when().seconds(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct CommitInfo {
    pub id: String,
    pub summary: Option<String>,
    pub body: Option<String>,
    pub time: i64,
    pub parents: Vec<String>,
    pub author: SignatureInfo,
    pub committer: SignatureInfo,
}

impl CommitInfo {
    pub fn new(commit: &Commit) -> Self {
        CommitInfo {
            id: commit.id().to_string(),
            summary: commit.summary().map(|v| v.to_owned()),
            body: commit.body().map(|v| v.to_owned()),
            time: commit.time().seconds(),
            parents: commit.parent_ids().map(|id| id.to_string()).collect_vec(),
            author: SignatureInfo::new(&commit.author()),
            committer: SignatureInfo::new(&commit.committer()),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum BranchPath {
    Base(usize),   // top -> commit
    Parent(usize), // commit -> bottom
    Follow(usize), // top -> bottom
                   // Line(usize, usize), // top -> bottom
}

#[derive(Debug, Serialize)]
pub struct PositionedCommit {
    pub commit: CommitInfo,
    pub descendants: Vec<String>,
    pub position: usize,
    pub paths: Vec<BranchPath>,
}

struct CommitPositioner<'a, I>
where
    I: Iterator<Item = Commit<'a>>,
{
    branches: Vec<Option<Oid>>,
    descendants: HashMap<String, Vec<String>>,
    underlying: I,
}

trait PositionCommit<'a>: Iterator<Item = Commit<'a>> {
    fn position_commit(self) -> CommitPositioner<'a, Self>
    where
        Self: Sized,
    {
        CommitPositioner {
            branches: vec![],
            descendants: HashMap::new(),
            underlying: self,
        }
    }
}

impl<'a, I: Iterator<Item = Commit<'a>>> PositionCommit<'a> for I {}

impl<'a, I> Iterator for CommitPositioner<'a, I>
where
    I: Iterator<Item = Commit<'a>>,
{
    type Item = PositionedCommit;

    fn next(&mut self) -> Option<Self::Item> {
        let r = self.underlying.next();
        if let None = r {
            return None;
        }
        let commit = r.unwrap();

        // Step 1. set position and color of the commit + top paths (BranchPath::Base)
        let matching_branches = self
            .branches
            .iter()
            .map(|x| x.to_owned())
            .enumerate()
            .filter_map(|(i, content)| {
                content.and_then(|id| {
                    if commit.id().eq(&id) {
                        Some((i, id))
                    } else {
                        None
                    }
                })
            })
            .collect_vec();

        let (position, top_paths) = if matching_branches.len() == 0 {
            // It's a new branch
            let position = self
                .branches
                .iter()
                .find_position(|v| v.is_none())
                .map(|(pos, _)| pos)
                .unwrap_or(self.branches.len());
            (position, vec![])
        } else {
            // This commit is a base of all `matching_branches`
            // It will take the position and color of the first one (left-most)
            let (position, _) = matching_branches[0];
            let top_paths = matching_branches
                .iter()
                .map(|(position, _)| BranchPath::Base(*position))
                .collect_vec();
            (position, top_paths)
        };

        // Step 2. Follow through untouched branches
        let follow_paths = self
            .branches
            .iter()
            .map(|x| x.to_owned())
            .enumerate()
            .filter_map(|(i, content)| {
                content.and_then(|id| {
                    if commit.id().eq(&id) {
                        None
                    } else {
                        Some(BranchPath::Follow(i))
                    }
                })
            })
            .collect_vec();

        self.branches = self
            .branches
            .iter()
            .map(|content| content.and_then(|id| if commit.id().eq(&id) { None } else { Some(id) }))
            .collect();

        // Step 3. Wire everything up
        let mut paths = top_paths
            .iter()
            .chain(follow_paths.iter())
            .map(|x| x.clone())
            .collect_vec();

        // Step 4. Add this commit's legacy
        commit.parent_ids().enumerate().for_each(|(i, parent_id)| {
            if i == 0 {
                if position == self.branches.len() {
                    self.branches.push(Some(parent_id))
                } else {
                    self.branches[position] = Some(parent_id);
                }
                paths.push(BranchPath::Parent(position));
            } else {
                // We can try and split it from an existing path if it's already there
                let existing = self
                    .branches
                    .iter()
                    .find_position(|content| {
                        content
                            .and_then(|id| Some(parent_id.eq(&id)))
                            .unwrap_or(false)
                    })
                    .map(|(position, _)| position);
                let position = existing
                    .or_else(|| {
                        let position = self
                            .branches
                            .iter()
                            .find_position(|v| v.is_none())
                            .map(|(pos, _)| pos)
                            .unwrap_or(self.branches.len());
                        Some(position)
                    })
                    .unwrap();

                if position == self.branches.len() {
                    self.branches.push(Some(parent_id))
                } else {
                    self.branches[position] = Some(parent_id);
                }
                paths.push(BranchPath::Parent(position));
            }
        });

        commit.parent_ids().for_each(|parent| {
            self.descendants
                .entry(parent.to_string())
                .or_insert_with(|| vec![])
                .push(commit.id().to_string());
        });

        let descendants = self
            .descendants
            .remove(&commit.id().to_string())
            .unwrap_or(vec![]);

        Some(PositionedCommit {
            commit: CommitInfo::new(&commit),
            position,
            descendants,
            paths,
        })
    }
}

pub fn get_positioned_commits<'a>(
    repo: &'a Repository,
) -> impl Iterator<Item = PositionedCommit> + 'a {
    get_revwalk(&repo)
        .unwrap()
        .filter_map(|oid| oid.ok().and_then(|oid| repo.find_commit(oid).ok()))
        .position_commit()
}

fn get_revwalk(repo: &Repository) -> Result<Revwalk, Error> {
    let mut walker = repo.revwalk()?;
    walker.set_sorting(Sort::TOPOLOGICAL.union(Sort::TIME))?;

    // walker.push_glob("*")?; // All (also stashes)
    walker.push_glob("refs/heads")?; // Local branches
    walker.push_glob("refs/remotes")?; // Remote branches
    walker.push_glob("refs/tags")?; // Tags

    // Add the head in case it's detached
    walker.push_head()?;

    Ok(walker)
}
