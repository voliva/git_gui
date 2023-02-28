import { CellRendererProps, Column, Grid } from "@/components/Grid";
import { readState } from "@/rxState";
import { createEffect, createMemo } from "solid-js";
import * as classes from "./RepoGrid.css";
import { BranchPath, commits$, PositionedCommit } from "./repoState";

const ITEM_HEIGHT = 30;
const COMMIT_RADIUS = 8;
const MERGE_RADIUS = 5;
const GRAPH_MARGIN = 3;

export function RepoGrid() {
  const commits = readState(commits$, null);

  const getMaxWidth = createMemo(() => {
    const position =
      commits()
        ?.flatMap((positioned) => [
          positioned.position,
          ...positioned.paths.map(([path, _]) => path.payload),
        ])
        .reduce((a, b) => Math.max(a, b)) ?? 0;
    return getPositionMaxX(position + 1); // Add one to account for gradient
  });

  const getInitialWidth = () => {
    return Math.min(getPositionX(3), getMaxWidth());
  };

  return (
    <>
      {commits() ? (
        <Grid
          class={classes.repoGrid}
          items={commits()!}
          itemSize={{ height: ITEM_HEIGHT }}
        >
          <Column
            width={getInitialWidth()}
            minWidth={COMMIT_RADIUS * 2 + GRAPH_MARGIN * 2}
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

// 200 because I want to start on blueish
// 137.50776 because it's the most irrational turn, meaning it will go around and around repeating as least as posible
// Derived from phi (227.5º -> 137.5º), maths in https://r-knott.surrey.ac.uk/Fibonacci/fibnat2.html
const getColor = (i: number) => `hsl(${200 + i * 137.50776}, 100%, 75%)`;

const GraphCell = (props: CellRendererProps<PositionedCommit>) => {
  let ref!: HTMLCanvasElement;

  createEffect(() => {
    const position = props.item.position;
    const ctx = ref.getContext("2d")!;
    const width = props.width ?? ref.width; // We need to call props.width to have this re-render when width changes.

    ctx.clearRect(0, 0, width, ref.height);
    props.item.paths.forEach((path) => drawPath(ctx, width, position, path));
    drawGradient(ctx, width);
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
  return <div class={classes.commitCell}>{props.item.commit.summary}</div>;
};

function drawCommit(
  ctx: CanvasRenderingContext2D,
  width: number,
  positionedCommit: PositionedCommit
) {
  ctx.beginPath();
  ctx.arc(
    Math.min(
      getPositionX(positionedCommit.position),
      width - COMMIT_RADIUS - GRAPH_MARGIN
    ),
    ITEM_HEIGHT / 2,
    positionedCommit.commit.is_merge ? MERGE_RADIUS : COMMIT_RADIUS,
    0,
    2 * Math.PI
  );
  ctx.fillStyle = `hsl(${positionedCommit.color}, 100%, 60%)`;
  ctx.fill();
}

function drawGradient(ctx: CanvasRenderingContext2D, width: number) {
  const xStart = width - COMMIT_RADIUS * 3;
  const grd = ctx.createLinearGradient(xStart, 0, width + 5, 0);
  grd.addColorStop(0, "#2f2f2f00");
  grd.addColorStop(0.4, "#2f2f2fff");
  ctx.fillStyle = grd;
  ctx.fillRect(xStart, 0, width + 5, ITEM_HEIGHT);
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
  return GRAPH_MARGIN + COMMIT_RADIUS + position * COMMIT_RADIUS * 2;
}
function getPositionMaxX(position: number) {
  return getPositionX(position) + COMMIT_RADIUS + GRAPH_MARGIN;
}
