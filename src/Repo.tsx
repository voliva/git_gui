import { VirtualContainer } from "@minht11/solid-virtual-container";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { defer } from "rxjs";
import { readState } from "./rxState";
import classes from "./Repo.module.css";
import { createEffect } from "solid-js";

const commits$ = state(defer(() => invoke<unknown[]>("get_commits")));

const ITEM_HEIGHT = 20;
const COMMIT_RADIUS = 8;

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

const ListItem = (props: any) => (
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

const CommitGraph = (props: any) => {
  let ref!: HTMLCanvasElement;

  createEffect(() => {
    const position = props.positionedCommit.position;
    const ctx = ref.getContext("2d")!;
    ctx.clearRect(0, 0, ref.width, ref.height);
    ctx.beginPath();
    ctx.arc(
      COMMIT_RADIUS + position * COMMIT_RADIUS * 2,
      ITEM_HEIGHT / 2,
      COMMIT_RADIUS,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "green";
    ctx.fill();
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
