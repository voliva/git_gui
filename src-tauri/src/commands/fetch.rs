use crate::AppState;
use git2::{AutotagOption, Remote, Repository};
use itertools::Itertools;

#[tauri::command(async)]
pub fn fetch(state: tauri::State<'_, AppState>) -> Result<(), ()> {
    // Fetch is an operation that takes long, since it fetches from all origin and all branches.
    // Instead of keeping the AppState locked forever, we just grab the path and create a new Repo object.
    // Move the sync problem to git2 trololo
    let path = state
        .repository
        .lock()
        .ok()
        .and_then(|mutex_repo| {
            return mutex_repo.as_ref().map(|(_, path)| path.clone());
        })
        .unwrap();

    let repo_to_fetch = Repository::open(path).unwrap();

    let remotes = get_remotes(&repo_to_fetch);

    remotes.into_iter().for_each(|mut remote| {
        // From https://github.com/rust-lang/git2-rs/blob/master/examples/fetch.rs

        // Download the packfile and index it. This function updates the amount of
        // received data and the indexer stats which lets you inform the user about
        // progress.
        remote.download(&[] as &[&str], None).unwrap();

        // Disconnect the underlying connection to prevent from idling.
        remote.disconnect().unwrap();

        // Update the references in the remote's namespace to point to the right
        // commits. This may be needed even if there was no packfile to download,
        // which can happen e.g. when the branches have been changed but all the
        // needed objects are available locally.
        remote
            .update_tips(None, true, AutotagOption::Unspecified, None)
            .unwrap();
    });

    Ok(())
}

fn get_remotes(repo: &Repository) -> Vec<Remote> {
    let remote_names = repo
        .remotes()
        .iter()
        .flat_map(|v| v)
        .filter_map(|v| v)
        .map(|v| v.to_owned())
        .collect_vec();

    remote_names
        .into_iter()
        .map(|name| repo.find_remote(&name).unwrap())
        .collect_vec()
}
