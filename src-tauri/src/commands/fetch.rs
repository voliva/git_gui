use std::{env, thread};

use git2::{AutotagOption, Cred, CredentialType, FetchOptions, RemoteCallbacks, Repository};
use itertools::Itertools;

use crate::timer::Timer;

#[tauri::command(async)]
pub fn fetch(path: String) {
    let mut timer = Timer::new();
    let repo = Repository::open(path.clone()).unwrap();
    let remotes = get_remotes(&repo);

    println!("fetch - get remotes {}", timer.lap());

    remotes
        .into_iter()
        .map(|remote_name| {
            let path = path.clone();
            thread::spawn(move || {
                let repo = Repository::open(path).unwrap();
                let mut remote = repo.find_remote(&remote_name).unwrap();
                let mut cb = RemoteCallbacks::new();
                cb.credentials(|_url, username_from_url, allowed_types| {
                    if allowed_types.contains(CredentialType::SSH_KEY) {
                        return Cred::ssh_key(
                            username_from_url.unwrap(),
                            None,
                            std::path::Path::new(&format!(
                                "{}/.ssh/id_rsa",
                                env::var("HOME").unwrap()
                            )),
                            None,
                        );
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
                    println!(
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
                remote.download(&[] as &[&str], Some(&mut options)).unwrap();

                // Disconnect the underlying connection to prevent from idling.
                remote.disconnect().unwrap();

                // Update the references in the remote's namespace to point to the right
                // commits. This may be needed even if there was no packfile to download,
                // which can happen e.g. when the branches have been changed but all the
                // needed objects are available locally.
                remote
                    .update_tips(None, true, AutotagOption::Unspecified, None)
                    .unwrap();
            })
        })
        .for_each(|handle| {
            handle.join().ok();
        });

    println!("fetch - download {}", timer.lap());
}

fn get_remotes(repo: &Repository) -> Vec<String> {
    repo.remotes()
        .iter()
        .flat_map(|v| v)
        .filter_map(|v| v)
        .map(|v| v.to_owned())
        .collect_vec()
}
