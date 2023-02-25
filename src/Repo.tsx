import {
  VirtualContainer,
  VirtualItemProps,
} from "@minht11/solid-virtual-container";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { defer } from "rxjs";
import { readState } from "./rxState";
import classes from "./Repo.module.css";
import { createEffect } from "solid-js";

interface CommitInfo {
  id: string;
  summary: string | null;
  body: string | null;
  is_merge: boolean;
  time: number; // epoch seconds
}

interface BranchPath {
  type: "Base" | "Parent" | "Follow";
  payload: number;
}

interface PositionedCommit {
  commit: CommitInfo;
  position: number;
  color: number;
  paths: Array<[BranchPath, number]>;
}

const commits$ = state(defer(() => invoke<PositionedCommit[]>("get_commits")));

const ITEM_HEIGHT = 20;
const COMMIT_RADIUS = 6;
const MERGE_RADIUS = 4;

export function Repo() {
  const commits = readState(commits$, null);

  let scrollTargetElement!: HTMLDivElement;

  return (
    <div style={{ overflow: "auto", height: "80vh" }} ref={scrollTargetElement}>
      {commits() ? (
        <VirtualContainer
          items={commits()!}
          scrollTarget={scrollTargetElement}
          // Define size you wish your list items to take.
          itemSize={{ height: ITEM_HEIGHT }}
        >
          {ListItem}
        </VirtualContainer>
      ) : null}
    </div>
  );
}

const ListItem = (props: VirtualItemProps<PositionedCommit>) => (
  <div
    class={classes.commitRow}
    // Required for items to switch places.
    style={{ ...props.style }}
    // Used for keyboard navigation and accessibility.
    tabIndex={props.tabIndex}
    role="listitem"
  >
    <CommitGraph positionedCommit={props.item} />
    <div class={classes.commitSummary}>{props.item.commit.summary}</div>
  </div>
);

const COLORS = [
  "rgb(100, 200, 50)",
  "rgb(200, 100, 50)",
  "rgb(100, 50, 200)",
  "rgb(50, 200, 100)",
  "rgb(200, 50, 100)",
  "rgb(50, 100, 200)",
];
const getColor = (i: number) => COLORS[i % COLORS.length];

const CommitGraph = (props: { positionedCommit: PositionedCommit }) => {
  let ref!: HTMLCanvasElement;

  createEffect(() => {
    const position = props.positionedCommit.position;
    const ctx = ref.getContext("2d")!;
    const width = ref.width;

    ctx.clearRect(0, 0, width, ref.height);
    props.positionedCommit.paths.forEach((path) =>
      drawPath(ctx, width, position, path)
    );
    drawCommit(ctx, width, props.positionedCommit);
  });

  return (
    <canvas
      height={ITEM_HEIGHT}
      width={200}
      class={classes.commitGraph}
      ref={ref}
    />
  );
};

function drawCommit(
  ctx: CanvasRenderingContext2D,
  width: number,
  positionedCommit: PositionedCommit
) {
  ctx.beginPath();
  ctx.arc(
    COMMIT_RADIUS +
      Math.min(
        positionedCommit.position * COMMIT_RADIUS * 2,
        width - 2 * COMMIT_RADIUS
      ),
    ITEM_HEIGHT / 2,
    positionedCommit.commit.is_merge ? MERGE_RADIUS : COMMIT_RADIUS,
    0,
    2 * Math.PI
  );
  ctx.fillStyle = getColor(positionedCommit.color);
  ctx.fill();
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  commitPos: number,
  [path, color]: [BranchPath, number]
) {
  switch (path.type) {
    case "Base":
      return drawBase(ctx, width, color, commitPos, path.payload);
    case "Follow":
      return drawFollow(ctx, width, color, path.payload);
    case "Parent":
      return drawParent(ctx, width, color, commitPos, path.payload);
  }
}
function drawBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  commitPos: number,
  pos: number
) {
  // if position.max(to) as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
  //     return;
  // }
  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(COMMIT_RADIUS + commitPos * COMMIT_RADIUS * 2, ITEM_HEIGHT / 2);
  ctx.lineTo(COMMIT_RADIUS + pos * COMMIT_RADIUS * 2, 0);
  ctx.stroke();
}
function drawFollow(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  pos: number
) {
  // if position as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
  //     return;
  // }

  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(COMMIT_RADIUS + pos * COMMIT_RADIUS * 2, 0);
  ctx.lineTo(COMMIT_RADIUS + pos * COMMIT_RADIUS * 2, ITEM_HEIGHT);
  ctx.stroke();
}
function drawParent(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  commitPos: number,
  pos: number
) {
  // if position.max(to) as f32 * RADIUS * 2.0 + RADIUS > available.x - RADIUS {
  //     return;
  // }
  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(COMMIT_RADIUS + commitPos * COMMIT_RADIUS * 2, ITEM_HEIGHT / 2);
  ctx.lineTo(COMMIT_RADIUS + pos * COMMIT_RADIUS * 2, ITEM_HEIGHT);
  ctx.stroke();
}
