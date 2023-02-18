use git2::{Error, Oid, Repository};
use itertools::Itertools;
use std::time::Instant;

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

    let positioned_commits = position_commits(&commits);

    // let branches = repo.branches(None).unwrap();
    // branches.for_each(|b| {
    //     let (branch, branchType) = b.unwrap();
    //     println!("{} {:?}", branch.name().unwrap().unwrap(), branchType);
    // });
    // println!("done");
}

struct PositionedCommit {
    commit: Commit,
    position: usize,
}

fn position_commits(commits: Vec<Commit>) -> _ {
    todo!()
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
