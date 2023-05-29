<script lang="ts">
  import { Side, selectedDelta$, selectedDeltaKind$ } from "./diffViewState";
  import type { Line } from "./diffLines";
  import { invoke } from "@tauri-apps/api";
  import { firstValueFrom } from "rxjs";
  import { repoPath$ } from "../repoState";

  export let lines: Array<Line>;
  export let side: Side | null = null;
  let hoveringLine: Line | null = null;

  $: stagingType =
    $selectedDeltaKind$ === "staged"
      ? "staged"
      : $selectedDeltaKind$ === "unstaged"
      ? "unstaged"
      : null;

  function getLineTypeSymbol(type: Line["type"]) {
    if (type == "add") {
      return "+";
    }
    if (type == "remove") {
      return "-";
    }
    return " ";
  }
  async function toggleStage(line: Line) {
    const delta = await firstValueFrom(selectedDelta$);
    const path = await firstValueFrom(repoPath$);
    invoke(stagingType === "staged" ? "unstage_line" : "stage_line", {
      path,
      delta,
      change: line.change,
    });
  }
</script>

<div class="hunk-content" on:mouseleave={() => (hoveringLine = null)}>
  {#if side == null || side == Side.OldFile}
    <div class="line-nums">
      {#each lines as line}
        <div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}
          style:height={(line.height ?? 1) + "lh"}
          on:mouseenter={() => (hoveringLine = line)}
        >
          {line.number[0] ?? " "}
        </div>
      {/each}
    </div>
  {/if}
  {#if side == null || side == Side.NewFile}
    <div class="line-nums">
      {#each lines as line}
        <div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}
          style:height={(line.height ?? 1) + "lh"}
          on:mouseenter={() => (hoveringLine = line)}
        >
          {line.number[1] ?? " "}
        </div>
      {/each}
    </div>
  {/if}
  <div class="change">
    {#each lines as line}
      <div
        class:added={line.type === "add"}
        class:removed={line.type === "remove"}
        style:height={(line.height ?? 1) + "lh"}
        on:mouseenter={() => (hoveringLine = line)}
      >
        {#if stagingType && line == hoveringLine && (line.type === "add" || line.type === "remove")}
          <input
            type="checkbox"
            checked={stagingType === "staged"}
            on:click={() => toggleStage(line)}
          />
        {:else}
          {getLineTypeSymbol(line.type)}
        {/if}
      </div>
    {/each}
  </div>
  <pre><code
      >{#each lines as line}<div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}
          class:pad={line.type === "pad"}
          style:height={(line.height ?? 1) + "lh"}
          on:mouseenter={() => (hoveringLine = line)}
          on:mouseleave={() => (hoveringLine = null)}>{@html line.content ||
            (line.type === "pad" ? "" : " ")}</div>{/each}</code
    ></pre>
</div>

<style>
  .hunk-content {
    display: flex;
    overflow: hidden;
    user-select: none;

    /* From prism's theme */
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    line-height: 1.5;
    tab-size: 2;
    hyphens: none;
  }
  .line-nums {
    flex: 0 0 auto;
  }
  .line-nums > div {
    padding: 0 0.5rem;
  }
  .change {
    flex: 0 0 auto;
    border-right: thin solid;
    width: 1.5rem; /* To accomodate the stage/unstage button */
    text-align: center;
  }
  .change input {
    margin: 0;
    vertical-align: middle;
  }
  pre {
    flex: 1 1 auto;
    user-select: text;
    margin: 0;
    overflow: auto;
  }
  code > div {
    padding: 0 0.5rem;
    width: fit-content;
  }
  .pad {
    background-image: linear-gradient(
      45deg,
      rgba(204, 204, 204, 0.2) 12.5%,
      #0000 12.5%,
      #0000 50%,
      rgba(204, 204, 204, 0.2) 50%,
      rgba(204, 204, 204, 0.2) 62.5%,
      #0000 62.5%,
      #0000 100%
    );
    background-size: 10px 10px;
    box-sizing: border-box;
    width: 100%;
    position: sticky;
    left: 0;
  }
  .added {
    background-color: #2a4025;
    padding-right: 0;
  }
  .removed {
    background-color: #40252a;
    padding-right: 0;
  }
</style>
