use std::collections::{HashMap, HashSet};

use derivative::Derivative;
use git2::{Commit, Error, Oid, Repository, Revwalk, Signature, Sort};
use itertools::Itertools;
use serde::Serialize;

use crate::timer::Timer;

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
    pub color: usize,
    pub paths: Vec<(BranchPath, usize)>, // (path, color)
}

struct CommitPositioner<I>
where
    I: Iterator,
    I::Item: CommitInfoAccessor,
{
    branches: Vec<Option<(Oid, usize)>>,
    underlying: I,
}

trait PositionCommit: Iterator {
    fn position_commit(self) -> CommitPositioner<Self>
    where
        Self::Item: CommitInfoAccessor,
        Self: Sized,
    {
        CommitPositioner {
            branches: vec![],
            underlying: self,
        }
    }
}

trait CommitInfoAccessor {
    fn id(&self) -> Oid;
}

impl<'a> CommitInfoAccessor for Commit<'a> {
    fn id(&self) -> Oid {
        self.id()
    }
}

impl<I: Iterator> PositionCommit for I {}

impl<I> Iterator for CommitPositioner<I>
where
    I: Iterator,
    I::Item: CommitInfoAccessor,
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
            color: author_colors
                .get(commit.author().email().unwrap_or(""))
                .unwrap()
                .to_owned(),
            position,
            paths,
        });
    }
}

pub fn get_positioned_commits(repo: &Repository) -> Vec<PositionedCommit> {
    let mut timer = Timer::new();

    let commits = get_revwalk(&repo)
        .unwrap()
        .filter_map(|oid| oid.ok().and_then(|oid| repo.find_commit(oid).ok()))
        .position_commit()
        .collect_vec();
    println!("Sort commits {}", timer.lap());

    // let result = position_commits(commits);
    println!("Position commits {}", timer.lap());

    return commits;
}

fn get_author_color(commit: &Vec<Commit>) -> HashMap<String, usize> {
    let authors = commits
        .iter()
        .map(|commit| {
            commit
                .author()
                .email()
                .map(|x| String::from(x))
                .unwrap_or(String::new())
        })
        .unique()
        .sorted()
        .collect_vec();

    let length = authors.len();
    if length == 0 {
        return HashMap::new();
    }

    /*
     * We want a colour assignment so that:
     * 1. Doesn't depend on the commit order
     * 2. Adding new authors shouldn't shift the colours (as much as posible)
     * 3. Two authors shouldn't have similar colours (as much as posible) (even if they have similar name)
     *
     * I'm thinking 2 ways, which compromise [2] and [3] :'D
     * 1. A function name -> colour would not shift [2], but it could happen that in a repo with 2 names both would have very similar colours.
     * 2. Split the colour wheel into as many authors as there are, assign by index. But when adding new authors they will shift colours around.
     *
     * I'm going with [2]
     *
     * TODO on repos where there's a large number of small contributors, keep the big contributors as separate as posible.
     * ---> After giving some thought, I think it's not posible to do it, specially if we want to keep the constraint of not moving colours too much.
     * Ideas I had:
     * 1. Sort authors in a way that it's guaranteed importants they are the most far apart
     *  After sorting by number of commits, take the best and put it on the first position.
     *  Then shift the positions of the subtriangle so that the best of that subtriangle is in the middle
     *  Then keep aplying the same "shift subtriangle so that the best is in the middle" for the new subtriangles
     *
     *      .:    :    .    :  .      :  .
     *    .::: => :  .:: => : ::.  => :: : . (or it was already done)
     *  .:::::    :.::::    :::::.    ::::.:
     *             |---|     || ||
     *
     *  problem is that someone adding a new commit can cause it to swap color to a completely different one.
     *
     * 2. Magnetism: After putting the authors in alphabetical order, make some sort of "magnetic push" so that the ones with big weighs push away from each other.
     *    I'm not sure how to make it work, specially weights on different stuff. Also, how does one author overtake the other if the distance becomes 0?
     * 3. Keep top # contributors further apart: Find the top contributor and the second contributor. Put the second contributor at a distance that's far away from the first one.
     *    Maybe similar for third and fourth contributors?
     *   => Has the same problem as [1]. If the second contributer commits and becomes the top contributor, it will shift colours around.
     * the best idea I had
     */
    let degree_distance = 360.0 / length as f32;
    return authors
        .into_iter()
        .enumerate()
        .map(|(i, author)| (author, (degree_distance * i as f32) as usize))
        .collect();
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
