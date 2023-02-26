import { VirtualItemProps } from "@minht11/solid-virtual-container";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { defer } from "rxjs";
import { createEffect } from "solid-js";
import { CellRendererProps, Column, Grid } from "./Grid";
import classes from "./Repo.module.css";
import { readState } from "./rxState";

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

  return (
    <>
      {commits() ? (
        <Grid items={commits()!} itemSize={{ height: ITEM_HEIGHT }}>
          <Column width={50}>{GraphCell}</Column>
          <Column header="Commit">{CommitCell}</Column>
        </Grid>
      ) : null}
    </>
  );
}

const Foo = (props: any) => {
  console.log("foo", props);

  return <div>Foo</div>;
};

const COLORS = [
  "rgb(100, 200, 50)",
  "rgb(200, 100, 50)",
  "rgb(100, 50, 200)",
  "rgb(50, 200, 100)",
  "rgb(200, 50, 100)",
  "rgb(50, 100, 200)",
];
const getColor = (i: number) => COLORS[i % COLORS.length];

const GraphCell = (props: CellRendererProps<PositionedCommit>) => {
  let ref!: HTMLCanvasElement;

  createEffect(() => {
    const position = props.item.position;
    const ctx = ref.getContext("2d")!;
    const width = ref.width;

    ctx.clearRect(0, 0, width, ref.height);
    props.item.paths.forEach((path) => drawPath(ctx, width, position, path));
    drawCommit(ctx, width, props.item);
  });

  return (
    <canvas
      height={ITEM_HEIGHT}
      width={props.width ?? 100}
      class={classes.commitGraph}
      ref={ref}
    />
  );
};

const CommitCell = (props: CellRendererProps<PositionedCommit>) => {
  return <>{props.item.commit.summary}</>;
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
  if ((Math.min(commitPos, pos) + 1) * COMMIT_RADIUS * 2 > width) {
    return;
  }
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
  if ((pos + 1) * COMMIT_RADIUS * 2 > width) {
    return;
  }

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
  if ((Math.min(commitPos, pos) + 1) * COMMIT_RADIUS * 2 > width) {
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(COMMIT_RADIUS + commitPos * COMMIT_RADIUS * 2, ITEM_HEIGHT / 2);
  ctx.lineTo(COMMIT_RADIUS + pos * COMMIT_RADIUS * 2, ITEM_HEIGHT);
  ctx.stroke();
}
