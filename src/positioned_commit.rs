use std::collections::HashSet;

use derivative::Derivative;
use git2::{Commit, Error, Oid, Repository, Signature, Time};
use itertools::Itertools;

use crate::timer::Timer;

#[derive(Derivative)]
#[derivative(Debug)]
pub struct CommitInfo {
    pub id: Oid,
    pub summary: Option<String>,
    pub body: Option<String>,
    pub time: Time,
    #[derivative(Debug = "ignore")]
    pub author: Signature<'static>,
    #[derivative(Debug = "ignore")]
    pub committer: Signature<'static>,
}

impl CommitInfo {
    pub fn new(commit: &Commit) -> Self {
        CommitInfo {
            id: commit.id(),
            summary: commit.summary().map(|v| v.to_owned()),
            body: commit.body().map(|v| v.to_owned()),
            time: commit.time(),
            author: commit.author().to_owned(),
            committer: commit.committer().to_owned(),
        }
    }
}

#[derive(Clone, Debug)]
pub enum BranchPath {
    Base(usize),   // top -> commit
    Parent(usize), // commit -> bottom
    Follow(usize), // top -> bottom
                   // Line(usize, usize), // top -> bottom
}

#[derive(Debug)]
pub struct PositionedCommit {
    pub commit: CommitInfo,
    pub position: usize,
    pub paths: Vec<(BranchPath, usize)>, // (path, color)
}

pub fn get_positioned_commits(repo: &Repository) -> Vec<PositionedCommit> {
    let mut timer = Timer::new();

    let commit_oids = get_commit_oids(&repo).unwrap();
    println!("get commits {}", timer.lap());

    let commits = commit_oids
        .iter()
        .filter_map(|oid| repo.find_commit(*oid).ok())
        .sorted_by(|a, b| b.time().cmp(&a.time()))
        .map(|c| c.to_owned())
        .collect_vec();
    println!("Sort commits {}", timer.lap());

    let result = position_commits(commits);
    println!("Position commits {}", timer.lap());

    return result;
}

fn position_commits(commits: Vec<Commit>) -> Vec<PositionedCommit> {
    let mut result = vec![];
    let mut branches: Vec<Option<(Oid, usize)>> = vec![];

    for commit in commits {
        // Step 1. set position and color of the commit + top paths (BranchPath::Base)
        let matching_branches = branches
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
            let position = branches
                .iter()
                .find_position(|v| v.is_none())
                .map(|(pos, _)| pos)
                .unwrap_or(branches.len());
            let color = get_avilable_color(&branches);
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
        let follow_paths = branches
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

        branches = branches
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
            if position == branches.len() {
                branches.push(Some((parents[0], color)))
            } else {
                branches[position] = Some((parents[0], color));
            }
            paths.push((BranchPath::Parent(position), color));

            if parents.len() > 1 {
                // We can try and split it from an existing path if it's already there
                let existing = branches
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
                        let position = branches
                            .iter()
                            .find_position(|v| v.is_none())
                            .map(|(pos, _)| pos)
                            .unwrap_or(branches.len());
                        Some((position, get_avilable_color(&branches)))
                    })
                    .unwrap();

                if position == branches.len() {
                    branches.push(Some((parents[1], color)))
                } else {
                    branches[position] = Some((parents[1], color));
                }
                paths.push((BranchPath::Parent(position), color));
            }
        }

        result.push(PositionedCommit {
            commit: CommitInfo::new(&commit),
            position,
            paths,
        });
    }

    return result;
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

fn get_commit_oids(repo: &Repository) -> Result<Vec<Oid>, Error> {
    let mut result = vec![];

    let mut walker = repo.revwalk()?;
    // Use "refs/heads" if you only want to get commits held by branches
    walker.push_glob("refs/heads")?;
    walker.for_each(|c| {
        if let Ok(oid) = c {
            result.push(oid);
        }
    });

    Ok(result)
}
