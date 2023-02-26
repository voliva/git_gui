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

  const getMaxWidth = () => {
    const position =
      commits()
        ?.flatMap((positioned) => [
          positioned.position,
          ...positioned.paths.map(([path, _]) => path.payload),
        ])
        .reduce((a, b) => Math.max(a, b)) ?? 0;
    return getPositionMaxX(position);
  };

  return (
    <>
      {commits() ? (
        <Grid items={commits()!} itemSize={{ height: ITEM_HEIGHT }}>
          <Column
            width={50}
            minWidth={COMMIT_RADIUS * 2}
            maxWidth={getMaxWidth()}
          >
            {GraphCell}
          </Column>
          <Column header="Commit">{CommitCell}</Column>
        </Grid>
      ) : null}
    </>
  );
}

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
    const maxPosition = [
      position,
      ...props.item.paths.map(([path]) => path.payload),
    ].reduce((a, b) => Math.max(a, b));
    if (getPositionMaxX(maxPosition) > width) {
      const xStart = width - COMMIT_RADIUS * 3;
      const grd = ctx.createLinearGradient(xStart, 0, width, 0);
      grd.addColorStop(0, "#2f2f2f00");
      grd.addColorStop(0.5, "#2f2f2fff");
      ctx.fillStyle = grd;
      ctx.fillRect(xStart, 0, width, ITEM_HEIGHT);
    }
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
    Math.min(getPositionX(positionedCommit.position), width - COMMIT_RADIUS),
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
  if (getPositionMaxX(Math.min(commitPos, pos)) > width) {
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(getPositionX(commitPos), ITEM_HEIGHT / 2);
  ctx.lineTo(getPositionX(pos), 0);
  ctx.stroke();
}
function drawFollow(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  pos: number
) {
  if (getPositionMaxX(pos) > width) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(getPositionX(pos), 0);
  ctx.lineTo(getPositionX(pos), ITEM_HEIGHT);
  ctx.stroke();
}
function drawParent(
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  commitPos: number,
  pos: number
) {
  if (getPositionMaxX(Math.min(commitPos, pos)) > width) {
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = getColor(color);
  ctx.lineWidth = 1;
  ctx.moveTo(getPositionX(commitPos), ITEM_HEIGHT / 2);
  ctx.lineTo(getPositionX(pos), ITEM_HEIGHT);
  ctx.stroke();
}

function getPositionX(position: number) {
  return COMMIT_RADIUS + position * COMMIT_RADIUS * 2;
}
function getPositionMaxX(position: number) {
  return getPositionX(position) + COMMIT_RADIUS;
}
