<script lang="ts">
  import { Side, type DeltaDiff, type Hunk } from "./diffViewState";

  export let highlightedDelta: DeltaDiff;
  export let hunk: Hunk;
  export let side: Side | null = null;

  interface Line {
    number: [number | null, number | null];
    type: "add" | "remove" | "pad" | null;
    content: string | null;
  }

  // TODO the component must be something that just takes this array of lines
  // then make a helper that will get the lines for a hunk
  // then the components that want to render just hunks will use that
  // and when we need to render the whole file we can have another function that uses that too for the hunks.
  let lines: Array<Line> = [];
  $: {
    lines.length = 0;

    const oldLines = highlightedDelta.old_file?.split("\n") ?? [];
    const newLines = highlightedDelta.new_file?.split("\n") ?? [];

    let oldNum = hunk.old_range[0];
    const oldEnd = oldNum + hunk.old_range[1];
    let newNum = hunk.new_range[0];
    const newEnd = newNum + hunk.new_range[1];

    // Helpers to avoid ternaries everywhere
    const getNum = (side: Side) => (side === Side.OldFile ? oldNum : newNum);
    const incrementNum = (side: Side) =>
      side === Side.OldFile ? oldNum++ : newNum++;
    const getLines = (side: Side) =>
      side === Side.OldFile ? oldLines : newLines;

    if (!side) {
      const changes = [...hunk.changes].reverse();
      while (oldNum < oldEnd || newNum < newEnd) {
        const change = changes.at(-1);
        if (change && getNum(change.side) === change.line_num) {
          // Add only the changed side
          lines.push({
            content: getLines(change.side)[change.line_num - 1],
            number:
              change.side === Side.NewFile ? [null, newNum] : [oldNum, null],
            type: change.change_type == "+" ? "add" : "remove",
          });
          incrementNum(change.side);
          changes.pop();
        } else {
          // Line unchanged, just push it.
          lines.push({
            content: newLines[newNum - 1],
            number: [oldNum, newNum],
            type: null,
          });
          newNum++;
          oldNum++;
        }
      }
    } else {
    }
  }

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

<hr />
<div class="hunk-content">
  <div class="line-nums">
    {#each lines as line}
      <div
        class:added={line.type === "add"}
        class:removed={line.type === "remove"}
      >
        {line.number[0] ?? " "}
      </div>
    {/each}
  </div>
  <div class="line-nums">
    {#each lines as line}
      <div
        class:added={line.type === "add"}
        class:removed={line.type === "remove"}
      >
        {line.number[1] ?? " "}
      </div>
    {/each}
  </div>
  <div class="change">
    {#each lines as line}
      <div
        class:added={line.type === "add"}
        class:removed={line.type === "remove"}
      >
        {getLineTypeSymbol(line.type)}
      </div>
    {/each}
  </div>
  <pre><code
      >{#each lines as line}<div
          class:added={line.type === "add"}
          class:removed={line.type === "remove"}>{@html line.content ||
            " "}</div>{/each}</code
    ></pre>
</div>
<hr />

<style>
  .hunk-content {
    display: flex;
    overflow: hidden;
    user-select: none;
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
  }
  .added {
    background-color: #2a4025;
  }
  .removed {
    background-color: #40252a;
  }
</style>
