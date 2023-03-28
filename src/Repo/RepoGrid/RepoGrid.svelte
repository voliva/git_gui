<script lang="ts">
  import { boxFill } from "@/quickStyles.css";
  import { commits$, type PositionedCommit } from "../repoState";
  import VirtualScroll from "svelte-virtual-scroll-list";
  import classNames from "classnames";
  import { getInitialWidth, getMaxWidth, getMinWidth } from "./graphColumn";
  import GraphCell from "./GraphCell.svelte";
  import CommitCell from "./CommitCell.svelte";
  import { activeCommit$, setActiveCommit } from "./activeCommit";
  import { repoGridRow } from "./commitRefs.css";
  import { ITEM_HEIGHT } from "./gridConstants";

  const RESIZER_WIDTH = 7;
  const activeCommitBgColor = "#222244";
  const hoverBgColor = "#444444";

  let canvasWidth = getInitialWidth();
  let hoveringRow: string | null = null;
  let gridHeight: number | null = null;

  $: graphColumnWidth = canvasWidth + RESIZER_WIDTH;
  $: keeps = gridHeight ? Math.ceil((1.4 * gridHeight) / ITEM_HEIGHT) : 30;

  const onGraphResizerMouseDown = (evt: MouseEvent) => {
    const initialWidth = graphColumnWidth;
    const initialMouseX = evt.screenX;
    const maxWidth = getMaxWidth(commits$.getValue() as PositionedCommit[]);
    const minWidth = getMinWidth();
    const onMouseMove = (evt: MouseEvent) => {
      const delta = evt.screenX - initialMouseX;
      const targetX = initialWidth + delta;
      const boundX = Math.min(
        Math.max(targetX, minWidth ?? 0),
        maxWidth ?? Number.POSITIVE_INFINITY
      );
      canvasWidth = boundX;
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  function watchHeight(el: HTMLDivElement) {
    let lastHeight: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (lastHeight !== entry.contentRect.height) {
          gridHeight = lastHeight = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(el);

    return {
      destroy() {
        resizeObserver.unobserve(el);
      },
    };
  }
</script>

{#if $commits$}
  <div
    use:watchHeight
    class={classNames(boxFill, "repoGrid")}
    style="--active-commit-bg-color: {activeCommitBgColor}; --hover-bg-color: {hoverBgColor};"
  >
    <VirtualScroll
      data={$commits$}
      key="id"
      estimateSize={ITEM_HEIGHT}
      {keeps}
      let:data
    >
      <div
        class={classNames("row", repoGridRow, {
          "active-commit": $activeCommit$ === data.id,
        })}
        role="listitem"
        on:mouseenter={() => (hoveringRow = data.id)}
        on:mouseleave={() => (hoveringRow = null)}
        on:click={() => setActiveCommit(data.id)}
        on:keypress={(evt) => evt.key === "enter" && setActiveCommit(data.id)}
      >
        <div class="cell" style:width={graphColumnWidth + "px"}>
          <GraphCell
            item={data}
            width={canvasWidth}
            isHovering={hoveringRow === data.id}
            isActive={$activeCommit$ === data.id}
          />
          <div
            class="resizer"
            on:mousedown={onGraphResizerMouseDown}
            role="presentation"
          />
        </div>
        <div class="cell"><CommitCell item={data} /></div>
      </div>
    </VirtualScroll>
  </div>
{:else}
  <div class={boxFill} />
{/if}

<style>
  .repoGrid {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-user-select: none;
    user-select: none;
  }

  .cell {
    display: flex;
  }

  .row {
    display: flex;
    cursor: pointer;
    height: 30px;
    overflow: hidden;
  }
  .row:hover {
    z-index: 1; /* Above other rows */
    overflow: visible; /* To allow for hovering elements to overflow */
    background-color: var(--hover-bg-color);
  }
  .row.active-commit {
    background-color: var(--active-commit-bg-color);
  }

  .resizer {
    cursor: col-resize;
    width: 1px;
    padding: 0 3px;
    flex: 0 0 auto;
    background-color: darkgray;
    background-clip: content-box;
  }
</style>
