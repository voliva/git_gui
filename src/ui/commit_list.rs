use egui::{Color32, Pos2, Rect, Stroke, Vec2};
use egui_extras::{Column, TableBuilder};

use crate::positioned_commit::{BranchPath, PositionedCommit};

static RADIUS: f32 = 5.0;

pub fn commit_list(ui: &mut egui::Ui, commits: &Vec<PositionedCommit>) -> Option<usize> {
    let text_height = egui::TextStyle::Body.resolve(ui.style()).size;
    let num_rows = commits.len();

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

    let mut clicked_row = None;

    table
        .header(20.0, |mut header| {
            header.col(|_ui| {
                // Header prevents the column from getting smaller than its width
                // ui.strong("Graph");
            });
            header.col(|ui| {
                ui.strong("Message");
            });
        })
        .body(|body| {
            body.rows(text_height, num_rows, |row_index, mut row| {
                let commit = &commits[row_index];

                let cols = vec![
                    row.col(|ui| {
                        graph_line(ui, &commit);
                    }),
                    row.col(|ui| {
                        let summary = &commit.commit.summary;
                        ui.label(summary.to_owned().unwrap_or("".to_owned()));
                    }),
                ];

                let clicked = cols.iter().any(|(_, resp)| resp.clicked());
                if clicked {
                    println!("clicked");
                    clicked_row = Some(row_index);
                }
            });
        });

    return clicked_row;
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
