import { CellRendererProps, Column, Grid } from "@/components/Grid";
import { readState } from "@/rxState";
import { appBgColor } from "@/style.css";
import { createEffect, createMemo } from "solid-js";
import * as classes from "./RepoGrid.css";
import { hoverBgColor } from "./RepoGrid.css";
import { BranchPath, commits$, PositionedCommit } from "./repoState";

const ITEM_HEIGHT = 30;
const COMMIT_RADIUS = 10;
const COMMIT_BORDER = 2; // Extra around the gravatar
const MERGE_RADIUS = 5;
const GRAPH_MARGIN = 3;

export function RepoGrid() {
  const commits = readState(commits$, null);

  const getMaxWidth = createMemo(() => {
    const position =
      commits()
        ?.flatMap((positioned) => [
          positioned.position,
          ...positioned.paths.map((path) => path.payload),
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
          // -1: we need a bit of an overlap, otherwise sometimes there's a glitch where the lines look segmented.
          itemSize={{ height: ITEM_HEIGHT - 1 }}
        >
          <Column
            width={getInitialWidth()}
            minWidth={COMMIT_RADIUS * 2 + GRAPH_MARGIN * 2}
            maxWidth={getMaxWidth()}
            itemClass={classes.highlightOnHover}
          >
            {GraphCell}
          </Column>
          <Column
            header="Commit"
            headerClass={classes.commitHeader}
            itemClass={classes.highlightOnHover}
          >
            {CommitCell}
          </Column>
        </Grid>
      ) : null}
    </>
  );
}

let BASE_COLOR = 150;

// 200 because I want to start on blueish
// 137.50776 because it's the most irrational turn, meaning it will go around and around repeating as least as posible
// Derived from phi (227.5º -> 137.5º), maths in https://r-knott.surrey.ac.uk/Fibonacci/fibnat2.html
// I prefer a rainbow effect. 53 because it's a smallish prime number, far from any factor of 360 (between 45 and 60)
// Alternatives would be 79 [72,90], 31 or 33 [30, 36], and 27 or 29 [24,30]
const getColor = (i: number) => `hsl(${BASE_COLOR + i * 53}, 100%, 75%)`;

const GraphCell = (props: CellRendererProps<PositionedCommit>) => {
  let ref!: HTMLCanvasElement;

  createEffect(() => {
    const position = props.item.position;
    const ctx = ref.getContext("2d")!;
    const width = props.width ?? ref.width; // We need to call props.width to have this re-render when width changes.

    ctx.clearRect(0, 0, width, ref.height);
    props.item.paths.forEach((path) => drawPath(ctx, width, position, path));
    drawGradient(ctx, width, props.isHovering);
    drawCommit(ctx, width, () => props.item);
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

const gravatarImages = new Map<
  string,
  Promise<HTMLImageElement> | HTMLImageElement
>();
const getGravatarImage = (hash: string) => {
  if (gravatarImages.has(hash)) {
    return gravatarImages.get(hash)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener(
      "load",
      () => {
        gravatarImages.set(hash, img);
        resolve(img);
      },
      { once: true }
    );
    img.addEventListener("error", (e) => reject(e), { once: true });
    img.src = `https://www.gravatar.com/avatar/${hash}?s=${
      COMMIT_RADIUS * 2
    }&d=retro`;
  });
  // Depending on runtime and cache maybe this can happen?
  if (gravatarImages.has(hash)) {
    return gravatarImages.get(hash)!;
  }
  gravatarImages.set(hash, promise);
  return promise;
};

const MAGIC_NUMBER = 137.50776;
const NO_ONE = "no_one";
function getAuthorColor(hash: string) {
  const turns = Number.parseInt(hash.slice(0, 5), 16) % 360;
  if (Number.isNaN(turns)) {
    return 0;
  }
  return Math.round(MAGIC_NUMBER * turns) % 360;
}

async function drawCommit(
  ctx: CanvasRenderingContext2D,
  width: number,
  positionedCommitGetter: () => PositionedCommit
) {
  const positionedCommit = positionedCommitGetter();
  ctx.beginPath();
  const centerX = Math.min(
    getPositionX(positionedCommit.position),
    width - COMMIT_RADIUS - GRAPH_MARGIN
  );
  const centerY = ITEM_HEIGHT / 2;
  const hash = positionedCommit.commit.author.hash ?? NO_ONE;
  const color = getAuthorColor(hash);
  ctx.arc(
    centerX,
    centerY,
    positionedCommit.commit.is_merge
      ? MERGE_RADIUS
      : COMMIT_RADIUS + COMMIT_BORDER,
    0,
    2 * Math.PI
  );
  ctx.fillStyle = `hsl(${color}, 100%, 60%)`;
  ctx.fill();

  if (!positionedCommit.commit.is_merge) {
    const imgOrPromise = getGravatarImage(hash);
    const img = "then" in imgOrPromise ? await imgOrPromise : imgOrPromise;
    if (positionedCommit !== positionedCommitGetter()) {
      // The component updated with another commit while we were waiting the image to load
      // If we continue, we would be drawing an old image on a new version of the canvas.
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, COMMIT_RADIUS, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, centerX - COMMIT_RADIUS, centerY - COMMIT_RADIUS);
    ctx.restore();
  }
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  isHovering: boolean
) {
  const xStart = width - COMMIT_RADIUS * 3;
  const grd = ctx.createLinearGradient(xStart, 0, width + 5, 0);
  const bgColor = isHovering ? hoverBgColor : appBgColor;
  grd.addColorStop(0, bgColor + "00");
  grd.addColorStop(0.4, bgColor + "ff");
  ctx.fillStyle = grd;
  ctx.fillRect(xStart, 0, width + 5, ITEM_HEIGHT);
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  commitPos: number,
  path: BranchPath
) {
  switch (path.type) {
    case "Base":
      return drawBase(ctx, width, commitPos, path.payload);
    case "Follow":
      return drawFollow(ctx, width, path.payload);
    case "Parent":
      return drawParent(ctx, width, commitPos, path.payload);
  }
}
function drawBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  commitPos: number,
  pos: number
) {
  if (getPositionMaxX(Math.min(commitPos, pos)) > width) {
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = getColor(pos);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.moveTo(getPositionX(commitPos), ITEM_HEIGHT / 2);
  if (commitPos !== pos) {
    const radius = ITEM_HEIGHT / 3;
    ctx.lineTo(getPositionX(pos) - radius, ITEM_HEIGHT / 2);
    ctx.lineTo(getPositionX(pos), ITEM_HEIGHT / 2 - radius);
  }
  ctx.lineTo(getPositionX(pos), 0);
  ctx.stroke();
}
function drawFollow(ctx: CanvasRenderingContext2D, width: number, pos: number) {
  if (getPositionMaxX(pos) > width) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = getColor(pos);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.moveTo(getPositionX(pos), 0);
  ctx.lineTo(getPositionX(pos), ITEM_HEIGHT);
  ctx.stroke();
}
function drawParent(
  ctx: CanvasRenderingContext2D,
  width: number,
  commitPos: number,
  pos: number
) {
  if (getPositionMaxX(Math.min(commitPos, pos)) > width) {
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = getColor(pos);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.moveTo(getPositionX(commitPos), ITEM_HEIGHT / 2);
  if (commitPos !== pos) {
    const radius = ITEM_HEIGHT / 3;
    const direction = commitPos > pos ? -1 : 1; // -1 to left, 1 to right
    ctx.lineTo(getPositionX(pos) - direction * radius, ITEM_HEIGHT / 2);
    ctx.lineTo(getPositionX(pos), ITEM_HEIGHT / 2 + radius);
  }
  ctx.lineTo(getPositionX(pos), ITEM_HEIGHT);
  ctx.stroke();
}

function getPositionX(position: number) {
  return GRAPH_MARGIN + COMMIT_RADIUS + position * COMMIT_RADIUS * 2;
}
function getPositionMaxX(position: number) {
  return getPositionX(position) + COMMIT_RADIUS + GRAPH_MARGIN;
}
