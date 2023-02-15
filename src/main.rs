use git2::{Error, ObjectType, Oid, Repository};

fn main() {
    let mut repo = match Repository::open("./") {
        Ok(repo) => repo,
        Err(e) => panic!("failed to open: {}", e),
    };

    let commit_oids = get_commit_oids(&repo).unwrap();

    repo.stash_foreach(|s, str, oid| {
        println!("{} {} {:?}", s, str, oid);

        return true;
    })
    .unwrap();

    println!("{:?}", commit_oids);

    // let walker = repo.revwalk().unwrap();

    // walker.for_each(|c| {
    //     let oid = c.unwrap();
    //     let commit = repo.find_commit(oid).unwrap();
    //     println!("{} {}", oid, commit.message().unwrap());
    // });

    // let branches = repo.branches(None).unwrap();
    // branches.for_each(|b| {
    //     let (branch, branchType) = b.unwrap();
    //     println!("{} {:?}", branch.name().unwrap().unwrap(), branchType);
    // });
    // println!("done");

    // repo.odb()
    //     .unwrap()
    //     .foreach(|oid| {
    //         let odb = repo.odb().unwrap();
    //         let r = odb.read(*oid).unwrap();

    //         println!("{:?}", r.kind());

    //         return true;
    //     })
    //     .unwrap();
}

fn get_commit_oids(repo: &Repository) -> Result<Vec<Oid>, Error> {
    let mut result = vec![];

    let odb = repo.odb().unwrap();
    odb.foreach(|oid| {
        let r = odb.read(*oid).map(|v| v.kind());

        if matches!(r, Ok(ObjectType::Commit)) {
            result.push(oid.clone());
        }

        return true;
    })?;

    Ok(result)
}
