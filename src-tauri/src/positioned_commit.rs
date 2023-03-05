use derivative::Derivative;
use git2::{Commit, Error, Oid, Repository, Revwalk, Signature, Sort};
use itertools::Itertools;
use serde::Serialize;
use std::collections::HashSet;

#[derive(Derivative, Serialize)]
#[derivative(Debug)]
pub struct CommitInfo {
    pub id: String,
    pub summary: Option<String>,
    pub body: Option<String>,
    pub time: i64,
    pub is_merge: bool,
    #[derivative(Debug = "ignore")]
    #[serde(skip)]
    pub author: Signature<'static>,
    #[derivative(Debug = "ignore")]
    #[serde(skip)]
    pub committer: Signature<'static>,
}

impl CommitInfo {
    pub fn new(commit: &Commit) -> Self {
        CommitInfo {
            id: commit.id().to_string(),
            summary: commit.summary().map(|v| v.to_owned()),
            body: commit.body().map(|v| v.to_owned()),
            time: commit.time().seconds(),
            is_merge: commit.parent_count() > 1,
            author: commit.author().to_owned(),
            committer: commit.committer().to_owned(),
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
    pub position: usize,
    pub paths: Vec<(BranchPath, usize)>, // (path, color)
}

struct CommitPositioner<'a, I>
where
    I: Iterator<Item = Commit<'a>>,
{
    branches: Vec<Option<(Oid, usize)>>,
    underlying: I,
}

trait PositionCommit<'a>: Iterator<Item = Commit<'a>> {
    fn position_commit(self) -> CommitPositioner<'a, Self>
    where
        Self: Sized,
    {
        CommitPositioner {
            branches: vec![],
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
                if let Some((id, color)) = content {
                    if commit.id().eq(&id) {
                        Some((i, (id, color)))
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect_vec();

        let (position, color, top_paths) = if matching_branches.len() == 0 {
            // It's a new branch
            let position = self
                .branches
                .iter()
                .find_position(|v| v.is_none())
                .map(|(pos, _)| pos)
                .unwrap_or(self.branches.len());
            let color = get_avilable_color(&self.branches);
            (position, color, vec![])
        } else {
            // This commit is a base of all `matching_branches`
            // It will take the position and color of the first one (left-most)
            let (position, (_, color)) = matching_branches[0];
            let top_paths = matching_branches
                .iter()
                .map(|(position, (_, color))| (BranchPath::Base(*position), *color))
                .collect_vec();
            (position, color, top_paths)
        };

        // Step 2. Follow through untouched branches
        let follow_paths = self
            .branches
            .iter()
            .map(|x| x.to_owned())
            .enumerate()
            .filter_map(|(i, content)| {
                if let Some((id, color)) = content {
                    if commit.id().eq(&id) {
                        None
                    } else {
                        Some((BranchPath::Follow(i), color))
                    }
                } else {
                    None
                }
            })
            .collect_vec();

        self.branches = self
            .branches
            .iter()
            .map(|content| {
                if let Some((id, color)) = *content {
                    if commit.id().eq(&id) {
                        None
                    } else {
                        Some((id, color))
                    }
                } else {
                    None
                }
            })
            .collect();

        // Step 3. Wire everything up
        let mut paths = top_paths
            .iter()
            .chain(follow_paths.iter())
            .map(|x| x.clone())
            .collect_vec();

        // Step 4. Add this commit's legacy
        let parents = commit.parent_ids().collect_vec();
        if parents.len() > 0 {
            if position == self.branches.len() {
                self.branches.push(Some((parents[0], color)))
            } else {
                self.branches[position] = Some((parents[0], color));
            }
            paths.push((BranchPath::Parent(position), color));

            if parents.len() > 1 {
                // We can try and split it from an existing path if it's already there
                let existing = self
                    .branches
                    .iter()
                    .find_position(|content| {
                        content
                            .and_then(|(id, _)| Some(parents[1].eq(&id)))
                            .unwrap_or(false)
                    })
                    .map(|(position, content)| {
                        let (_, color) = content.unwrap();
                        (position, color)
                    });
                let (position, color) = existing
                    .or_else(|| {
                        let position = self
                            .branches
                            .iter()
                            .find_position(|v| v.is_none())
                            .map(|(pos, _)| pos)
                            .unwrap_or(self.branches.len());
                        Some((position, get_avilable_color(&self.branches)))
                    })
                    .unwrap();

                if position == self.branches.len() {
                    self.branches.push(Some((parents[1], color)))
                } else {
                    self.branches[position] = Some((parents[1], color));
                }
                paths.push((BranchPath::Parent(position), color));
            }
        }

        Some(PositionedCommit {
            commit: CommitInfo::new(&commit),
            position,
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

fn get_avilable_color(branches: &Vec<Option<(Oid, usize)>>) -> usize {
    let mut set: HashSet<usize> = HashSet::from_iter(0..(branches.len() + 1));

    branches
        .iter()
        .filter_map(|opt| opt.map(|x| x))
        .for_each(|(_, c)| {
            set.remove(&c);
        });

    return set.iter().next().unwrap().to_owned();
}

fn get_revwalk(repo: &Repository) -> Result<Revwalk, Error> {
    // let refs = repo.references().unwrap();
    // for reference in refs {
    //     println!("Ref: {:?}", reference.unwrap().name());
    // }

    let mut walker = repo.revwalk()?;
    walker.set_sorting(Sort::TOPOLOGICAL.union(Sort::TIME))?;
    // Use "refs/heads" if you only want to get commits held by branches
    walker.push_glob("refs/heads")?;
    walker.push_glob("refs/remotes")?;

    Ok(walker)
}
