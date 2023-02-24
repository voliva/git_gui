#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release

mod positioned_commit;
mod timer;
mod ui;

use eframe::egui;
use egui::{Pos2, Rect, Sense, Vec2};
use git2::Repository;

use crate::positioned_commit::{get_positioned_commits, PositionedCommit};
use crate::timer::Timer;
use crate::ui::commit_list::commit_list;

fn main() -> Result<(), eframe::Error> {
    // Log to stdout (if you run with `RUST_LOG=debug`).
    tracing_subscriber::fmt::init();

    let options = eframe::NativeOptions {
        initial_window_size: Some(egui::vec2(320.0, 240.0)),
        ..Default::default()
    };

    let mut timer = Timer::new();
    let repo = match Repository::open("/Users/victor/development/ads/alpha") {
        Ok(repo) => repo,
        Err(e) => panic!("failed to open: {}", e),
    };
    println!("Open repo {}", timer.lap());

    let app = MyApp::new(&repo);
    eframe::run_native("My egui App", options, Box::new(|_cc| Box::new(app)))
}

struct MyApp {
    commits: Vec<PositionedCommit>,
}

impl MyApp {
    fn new(repo: &Repository) -> Self {
        let positioned_commits = get_positioned_commits(repo);

        Self {
            commits: positioned_commits,
        }
    }
}

impl eframe::App for MyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            let res1 = ui.allocate_rect(
                Rect::from_two_pos(Pos2::new(0.0, 0.0), Pos2::new(100.0, 100.0)),
                Sense::click(),
            );
            let res2 = ui.allocate_rect(
                Rect::from_two_pos(Pos2::new(0.0, 0.0), Pos2::new(100.0, 100.0)),
                Sense::click(),
            );

            if res1.clicked() {
                println!("Clicked res1");
            }
            if res2.clicked() {
                println!("Clicked res2");
            }
            if res1.hovered() {
                println!("hovered res1");
            }
            if res2.hovered() {
                println!("hovered res2");
            }

            // let r = commit_list(ui, &self.commits);
            // if let Some(commit_idx) = r {
            //     println!("Clicked {:?}", self.commits[commit_idx]);
            // }
        });
    }
}
