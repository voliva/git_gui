use logging_timer::time;
use mime_sniffer::MimeTypeSniffer;
use port_check::free_local_port;
use std::path::Path;
use std::str::FromStr;
use tauri::State;

extern crate rocket;

use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::{ContentType, Header};
use rocket::{Request, Response};

use crate::AppState;

pub struct CORS;

#[rocket::async_trait]
impl Fairing for CORS {
    fn info(&self) -> Info {
        Info {
            name: "Add CORS headers to responses",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, GET, PATCH, OPTIONS",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

#[rocket::get("/raw/<path>/<id>?<file>")]
fn get_raw_file(path: &str, id: &str, file: Option<&str>) -> (rocket::http::ContentType, Vec<u8>) {
    // first
    let repo = git2::Repository::open(path).unwrap();
    let id = git2::Oid::from_str(id).and_then(|id| {
        if id.is_zero() {
            repo.blob_path(&Path::new(path).join(file.unwrap()))
        } else {
            Ok(id)
        }
    });
    let blob = repo.find_blob(id.unwrap()).unwrap();
    let content = blob.content();

    let content_type = content
        .sniff_mime_type()
        .and_then(|mime_type| rocket::http::ContentType::from_str(mime_type).ok())
        .unwrap_or(ContentType::Any);

    (content_type, content.into())
}

pub fn launch_server() -> u16 {
    let port = free_local_port().unwrap();

    let mut config = rocket::config::Config::default();
    config.port = port.clone();

    tauri::async_runtime::spawn(
        rocket::build()
            .configure(config)
            .mount("/", rocket::routes![get_raw_file])
            .attach(CORS)
            .launch(),
    );

    return port;
}

#[time]
#[tauri::command]
pub fn get_port(state: State<AppState>) -> u16 {
    state.port
}
