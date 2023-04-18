use std::{env, thread};

use git2::{AutotagOption, Cred, CredentialType, FetchOptions, RemoteCallbacks, Repository};
use itertools::Itertools;
use log::{error, info};
use logging_timer::{executing, timer};

use super::serializer::git_error::GitError;

#[tauri::command(async)]
pub fn fetch(path: String) -> Result<(), GitError> {
    let tmr = timer!("fetch()");
    let repo = Repository::open(path.clone())?;
    let remotes = get_remotes(&repo);

    executing!(tmr, "get remotes");

    remotes
        .into_iter()
        .map(|remote_name| {
            let path = path.clone();
            thread::spawn(move || {
                if let Err(err) = fetch_remote(path, &remote_name) {
                    error!("Error fetching remote {}: {:?}", remote_name, err);
                }
            })
        })
        .for_each(|handle| {
            handle.join().ok();
        });

    Ok(())
}

fn fetch_remote(path: String, remote_name: &str) -> Result<(), GitError> {
    let repo = Repository::open(path)?;
    let mut remote = repo.find_remote(remote_name)?;
    let mut cb = RemoteCallbacks::new();
    cb.credentials(|_url, username_from_url, allowed_types| {
        if allowed_types.contains(CredentialType::SSH_KEY) {
            if let Some(username) = username_from_url {
                Cred::ssh_key(
                    username,
                    None,
                    std::path::Path::new(&format!(
                        "{}/.ssh/id_rsa",
                        env::var("HOME").expect("Needs home env var")
                    )),
                    None,
                )?;
            } else {
                Err(git2::Error::new(
                    git2::ErrorCode::User,
                    git2::ErrorClass::None,
                    "SSH_KEY credential needs username on url",
                ))?
            }
            // } else if _allowed_types.contains(CredentialType::USER_PASS_PLAINTEXT) {
            //     let mut backend = dialog::backends::Dialog::new();
            //     backend.set_backtitle("dialog demo");
            //     backend.set_width(100);
            //     backend.set_height(10);

            //     let username = dialog::Input::new("Username")
            //         .title("Git Credentials")
            //         .show_with(&backend)
            //         .expect("Could not display dialog box")
            //         .unwrap();

            //     let password = dialog::Password::new("Password")
            //         .title("Git Credentials")
            //         .show_with(&backend)
            //         .expect("Could not display dialog box")
            //         .unwrap();

            //     Cred::userpass_plaintext(&username, &password)
            // } else {
            //     panic!(
            //         "Credentials requested {} {:?} {:?}",
            //         _url, username_from_url, _allowed_types
            //     );
        }
        // println!(
        //     "Unsupported credentials for remote {:?}: {:?}",
        //     name, allowed_types
        // );

        Err(git2::Error::new(
            git2::ErrorCode::User,
            git2::ErrorClass::None,
            "Unsupported credentials",
        ))
    });
    cb.transfer_progress(|progress| {
        info!(
            "Transfer progress {} {}/{}",
            progress.received_bytes(),
            progress.received_objects(),
            progress.total_objects()
        );
        true
    });

    // From https://github.com/rust-lang/git2-rs/blob/master/examples/fetch.rs

    // Download the packfile and index it. This function updates the amount of
    // received data and the indexer stats which lets you inform the user about
    // progress.
    let mut options = FetchOptions::new();
    options.remote_callbacks(cb);
    remote.download(&[] as &[&str], Some(&mut options))?;

    // Disconnect the underlying connection to prevent from idling.
    remote.disconnect()?;

    // Update the references in the remote's namespace to point to the right
    // commits. This may be needed even if there was no packfile to download,
    // which can happen e.g. when the branches have been changed but all the
    // needed objects are available locally.
    remote.update_tips(None, true, AutotagOption::Unspecified, None)?;

    Ok(())
}

fn get_remotes(repo: &Repository) -> Vec<String> {
    repo.remotes()
        .iter()
        .flat_map(|v| v)
        .filter_map(|v| v)
        .map(|v| v.to_owned())
        .collect_vec()
}
