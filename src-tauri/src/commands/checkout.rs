use super::serializer::git_error::GitError;
use git2::{build::CheckoutBuilder, Oid, Repository};
use logging_timer::time;

#[time]
#[tauri::command(async)]
pub fn checkout_commit(path: String, id: String) -> Result<(), GitError> {
    let repo = Repository::open(path)?;

    let commit = repo.find_commit(Oid::from_str(&id)?)?;
    let tree = commit.tree()?;

    let mut opts = CheckoutBuilder::new();
    opts.safe();

    repo.checkout_tree(tree.as_object(), Some(&mut opts))?;

    repo.set_head_detached(commit.id())?;

    Ok(())
}

#[time]
#[tauri::command(async)]
pub fn checkout_local(path: String, branch_name: String) -> Result<(), GitError> {
    let repo = Repository::open(path)?;

    let branch = repo
        .branches(Some(git2::BranchType::Local))?
        .filter_map(|br| br.ok().map(|(branch, _)| branch))
        .find(|branch| {
            branch
                .name()
                .ok()
                .and_then(|v| v)
                .map(|name| name.eq(&branch_name))
                .unwrap_or(false)
        })
        .ok_or(GitError::Wrapped("Can't find branch".to_owned()))?;

    let reference = branch.into_reference();

    let tree = reference.peel_to_tree()?;
    let name = reference.name().ok_or(GitError::Wrapped(
        "Reference doesn't have a name".to_owned(),
    ))?;

    let mut opts = CheckoutBuilder::new();
    opts.safe();

    // first tree, then move HEAD https://stackoverflow.com/questions/56885218/libgit2-git-checkout-head-with-git-checkout-safe-do-nothing-with-working-dir
    repo.checkout_tree(tree.as_object(), Some(&mut opts))?;
    repo.set_head(name)?;

    Ok(())
}

#[time]
#[tauri::command(async)]
pub fn checkout_remote(path: String, origin: String, branch_name: String) -> Result<(), GitError> {
    let repo = Repository::open(path.clone())?;

    let origin_branch_name = format!("{}/{}", origin, branch_name);
    let branch = repo
        .branches(Some(git2::BranchType::Remote))?
        .filter_map(|br| br.ok().map(|(branch, _)| branch))
        .find(|branch| {
            branch
                .name()
                .ok()
                .and_then(|v| v)
                .map(|name| name.eq(&origin_branch_name))
                .unwrap_or(false)
        })
        .ok_or(GitError::Wrapped("Can't find branch".to_owned()))?;

    let reference = branch.into_reference();
    let commit = reference.peel_to_commit()?;
    let mut branch = repo.branch(&branch_name, &commit, false)?;
    branch.set_upstream(Some(&origin_branch_name))?;

    checkout_local(path, branch_name)?;

    Ok(())
}
