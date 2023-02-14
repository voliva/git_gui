use git2::Repository;

fn main() {
    println!("Hello, world!");

    let repo = match Repository::open("./") {
        Ok(repo) => repo,
        Err(e) => panic!("failed to open: {}", e),
    };

    let walker = repo.revwalk().unwrap();

    walker.for_each(|c| {
        let oid = c.unwrap();
        let commit = repo.find_commit(oid).unwrap();
        println!("{} {}", oid, commit.message().unwrap());
    });

    println!("done");
}
