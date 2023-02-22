#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release

use std::{collections::HashSet, time::Instant};

use eframe::{egui, App};
use egui::{Color32, Pos2, Rect, Stroke, Vec2};
use egui_extras::{Column, TableBuilder};
use git2::{Commit, Error, Oid, Repository, Signature, Time};
use itertools::{Itertools, Position};
use tracing_subscriber::fmt::format;

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

static RADIUS: f32 = 5.0;

impl eframe::App for MyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            let text_height = egui::TextStyle::Body.resolve(ui.style()).size;
            let num_rows = self.commits.len();

            let table = TableBuilder::new(ui)
                .striped(true)
                .cell_layout(egui::Layout::left_to_right(egui::Align::Center))
                .column(
                    Column::initial(100.0)
                        .range((RADIUS * 2.0)..=300.0)
                        .resizable(true),
                )
                .column(Column::remainder())
                .min_scrolled_height(0.0);

            table
                .header(20.0, |mut header| {
                    header.col(|ui| {
                        // Header prevents the column from getting smaller than its width
                        // ui.strong("Graph");
                    });
                    header.col(|ui| {
                        ui.strong("Message");
                    });
                })
                .body(|body| {
                    body.rows(text_height, num_rows, |row_index, mut row| {
                        let commit = &self.commits[row_index];

                        row.col(|ui| {
                            graph_line(ui, &commit);
                        });
                        row.col(|ui| {
                            let summary = &commit.commit.summary;
                            ui.label(summary.to_owned().unwrap_or("".to_owned()));
                        });
                    });
                });

            // let text_style = egui::TextStyle::Body;
            // let row_height = ui.text_style_height(&text_style);

            // egui::ScrollArea::vertical()
            //     .auto_shrink([false; 2])
            //     .show_rows(ui, row_height, 100, |ui, row_range| {
            //         for row in row_range {
            //             let text = format!("This is row {}/{}", row + 1, 100);
            //             ui.label(text);
            //         }
            //     });
        });
    }
}

fn graph_line(ui: &mut egui::Ui, positioned: &PositionedCommit) {
    lazy_static::lazy_static! {
        static ref  PALETTE: Vec<Color32> = vec![
            Color32::from_rgb(100, 200, 50),
            Color32::from_rgb(200, 100, 50),
            Color32::from_rgb(100, 50, 200),
            Color32::from_rgb(50, 200, 100),
            Color32::from_rgb(200, 50, 100),
            Color32::from_rgb(50, 100, 200),
        ];
    }

    let position = positioned.position as f32;

    let available_space = ui.available_size();

    let max_position = positioned
        .paths
        .iter()
        .map(|(path, _)| match path {
            BranchPath::Base(v) => v,
            BranchPath::Follow(v) => v,
            BranchPath::Parent(v) => v,
        })
        .max()
        .map(|v| *v)
        .unwrap_or(0)
        .max(positioned.position) as f32;

    let desired_size = egui::vec2(
        available_space.x.min(max_position * RADIUS * 2.0),
        available_space.y,
    );
    let (rect, _) = ui.allocate_exact_size(desired_size, egui::Sense::hover());

    if ui.is_rect_visible(rect) {
        positioned.paths.iter().for_each(|(path, color)| {
            match path {
                BranchPath::Base(v) => draw_base(
                    ui,
                    &rect,
                    &available_space,
                    PALETTE[*color % PALETTE.len()],
                    positioned.position,
                    *v,
                ),
                BranchPath::Follow(v) => draw_follow(
                    ui,
                    &rect,
                    &available_space,
                    PALETTE[*color % PALETTE.len()],
                    *v,
                ),
                BranchPath::Parent(v) => draw_parent(
                    ui,
                    &rect,
                    &available_space,
                    PALETTE[*color % PALETTE.len()],
                    positioned.position,
                    *v,
                ),
            };
        });

        // Draw the commit dot
        ui.painter().circle_filled(
            Pos2::new(
                rect.left()
                    + RADIUS
                    + (position * RADIUS * 2.0).min(available_space.x - 2.0 * RADIUS),
                rect.center().y,
            ),
            RADIUS,
            PALETTE[positioned.position % PALETTE.len()],
        );
    }
}
fn draw_base(
    ui: &mut egui::Ui,
    rect: &Rect,
    available: &Vec2,
    color: Color32,
    position: usize,
    to: usize,
) {
    if position.max(to) as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
        return;
    }
    ui.painter().line_segment(
        [
            Pos2::new(
                rect.left() + RADIUS + (position as f32) * RADIUS * 2.0,
                rect.center().y,
            ),
            Pos2::new(
                rect.left() + RADIUS + to as f32 * RADIUS * 2.0,
                rect.top() - 1.0,
            ),
        ],
        Stroke::new(1.0, color),
    )
}
fn draw_parent(
    ui: &mut egui::Ui,
    rect: &Rect,
    available: &Vec2,
    color: Color32,
    position: usize,
    to: usize,
) {
    if position.max(to) as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
        return;
    }
    ui.painter().line_segment(
        [
            Pos2::new(
                rect.left() + RADIUS + (position as f32) * RADIUS * 2.0,
                rect.center().y,
            ),
            Pos2::new(
                rect.left() + RADIUS + to as f32 * RADIUS * 2.0,
                rect.bottom() + 1.0,
            ),
        ],
        Stroke::new(1.0, color),
    )
}
fn draw_follow(ui: &mut egui::Ui, rect: &Rect, available: &Vec2, color: Color32, position: usize) {
    if position as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
        return;
    }
    ui.painter().line_segment(
        [
            Pos2::new(
                rect.left() + RADIUS + (position as f32) * RADIUS * 2.0,
                rect.top() - 1.0,
            ),
            Pos2::new(
                rect.left() + RADIUS + (position as f32) * RADIUS * 2.0,
                rect.bottom() + 1.0,
            ),
        ],
        Stroke::new(1.0, color),
    )
}

#[derive(Clone)]
enum BranchPath {
    Base(usize),   // top -> commit
    Parent(usize), // commit -> bottom
    Follow(usize), // top -> bottom
                   // Line(usize, usize), // top -> bottom
}

struct CommitInfo {
    id: Oid,
    summary: Option<String>,
    body: Option<String>,
    time: Time,
    author: Signature<'static>,
    committer: Signature<'static>,
}

impl CommitInfo {
    fn new(commit: &Commit) -> Self {
        CommitInfo {
            id: commit.id(),
            summary: commit.summary().map(|v| v.to_owned()),
            body: commit.body().map(|v| v.to_owned()),
            time: commit.time(),
            author: commit.author().to_owned(),
            committer: commit.committer().to_owned(),
        }
    }
}

struct PositionedCommit {
    commit: CommitInfo,
    position: usize,
    paths: Vec<(BranchPath, usize)>, // (path, color)
}

fn get_positioned_commits(repo: &Repository) -> Vec<PositionedCommit> {
    let mut timer = Timer::new();

    let commit_oids = get_commit_oids(&repo).unwrap();
    println!("get commits {}", timer.lap());

    let commits = commit_oids
        .iter()
        .filter_map(|oid| repo.find_commit(*oid).ok())
        .sorted_by(|a, b| b.time().cmp(&a.time()))
        .map(|c| c.to_owned())
        .collect_vec();
    println!("Sort commits {}", timer.lap());

    let result = position_commits(commits);
    println!("Position commits {}", timer.lap());

    return result;
}

fn position_commits(commits: Vec<Commit>) -> Vec<PositionedCommit> {
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
            commit: CommitInfo::new(&commit),
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
    walker.push_glob("refs/heads")?;
    walker.for_each(|c| {
        if let Ok(oid) = c {
            result.push(oid);
        }
    });

    Ok(result)
}

struct Timer {
    start: Instant,
}

impl Timer {
    fn new() -> Self {
        Timer {
            start: Instant::now(),
        }
    }

    fn lap(&mut self) -> String {
        let elapsed = self.start.elapsed();
        self.start = Instant::now();

        let nanos = elapsed.as_nanos();
        let decimals = format!("{nanos}").len();
        match decimals {
            0..=4 => format!("{} ns", elapsed.as_nanos()),
            5..=7 => format!("{} μs", elapsed.as_micros()),
            8..=10 => format!("{} ms", elapsed.as_millis()),
            _ => format!("{} s", elapsed.as_secs()),
        }
    }
}
