use git2::{Commit, Error, Oid, Repository};
use itertools::Itertools;
use std::{collections::HashSet, time::Instant};

fn main() {
    let repo = match Repository::open("E:\\development\\rxjs") {
        Ok(repo) => repo,
        Err(e) => panic!("failed to open: {}", e),
    };

    // repo.references_glob("*")
    //     .unwrap()
    //     .for_each(|r| println!("Ref {:?}", r.unwrap().name()));

    let start = Instant::now();

    let commit_oids = get_commit_oids(&repo).unwrap();
    println!("Read repo oids: {}", get_elapsed(start));
    let start = Instant::now();

    // TODO is it necessary to sort them?
    let commits = commit_oids
        .iter()
        .filter_map(|oid| repo.find_commit(*oid).ok())
        .sorted_by(|a, b| b.time().cmp(&a.time()))
        .collect_vec();

    println!("Read commits + sort: {}", get_elapsed(start));
    let start = Instant::now();

    let positioned_commits = position_commits(commits);

    println!("position commits: {}", get_elapsed(start));
    let start = Instant::now();

    // positioned_commits.iter().take(20).for_each(|positioned| {
    //     println!("{} {}", positioned.position, positioned.commit.id());
    // })
    // let branches = repo.branches(None).unwrap();
    // branches.for_each(|b| {
    //     let (branch, branchType) = b.unwrap();
    //     println!("{} {:?}", branch.name().unwrap().unwrap(), branchType);
    // });
    // println!("done");
}

#[derive(Clone)]
enum BranchPath {
    Base(usize),   // top -> commit
    Parent(usize), // commit -> bottom
    Follow(usize), // top -> bottom
                   // Line(usize, usize), // top -> bottom
}

struct PositionedCommit<'a> {
    commit: Commit<'a>,
    position: usize,
    paths: Vec<(BranchPath, usize)>, // (path, color)
}

fn position_commits<'a>(commits: Vec<Commit<'a>>) -> Vec<PositionedCommit<'a>> {
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
            commit,
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
    walker.push_glob("*")?;
    walker.for_each(|c| {
        if let Ok(oid) = c {
            result.push(oid);
        }
    });

    Ok(result)
}

fn get_elapsed(start: Instant) -> String {
    let elapsed = start.elapsed();

    let nanos = elapsed.as_nanos();
    let decimals = format!("{nanos}").len();
    match decimals {
        0..=4 => format!("{} ns", elapsed.as_nanos()),
        5..=7 => format!("{} μs", elapsed.as_micros()),
        8..=10 => format!("{} ms", elapsed.as_millis()),
        _ => format!("{} s", elapsed.as_secs()),
    }
}
