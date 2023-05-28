<script lang="ts">
  import { Side } from "./diffViewState";
  import type { Line } from "./diffLines";

  export let lines: Array<Line>;
  export let side: Side | null = null;

  function getLineTypeSymbol(type: Line["type"]) {
    if (type == "add") {
      return "+";
    }
    if (type == "remove") {
      return "-";
    }
    return " ";
  }
</script>

<div class="hunk-content">
  {#if side == null || side == Side.OldFile}
    <div class="line-nums">
      {#each lines as line}
        <div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}
          style:height={(line.height ?? 1) + "lh"}
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
      >
        {getLineTypeSymbol(line.type)}
      </div>
    {/each}
  </div>
  <pre><code
      >{#each lines as line}<div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}
          class:pad={line.type === "pad"}
          style:height={(line.height ?? 1) + "lh"}>{@html line.content ||
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
  .line-nums > div {
    padding: 0 0.5rem;
  }
  .change {
    border-right: thin solid;
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
