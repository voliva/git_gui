<script lang="ts">
  import { Side, type Change, type Hunk } from "./diffViewState";

  export let hunk: Hunk;
  export let oldFile: string | undefined;
  export let newFile: string | undefined;

  // TODO CRLF and other systems
  $: oldLines = oldFile?.split("\n");
  $: newLines = newFile?.split("\n");

  let hunkLines: Array<{
    oldLine: number | null;
    newLine: number | null;
    change: string | null;
    content: string;
  }> = [];
  $: {
    let [newLine, newRange] = hunk.new_range;
    let [oldLine, oldRange] = hunk.old_range;
    const newEnd = newLine + newRange;
    const oldEnd = oldLine + oldRange;
    let changeIdx = 0;

    hunkLines = [];
    if (newLines && oldLines) {
      while (newLine < newEnd || oldLine < oldEnd) {
        const change: Change | undefined = hunk.changes[changeIdx];
        const changeSideNumber =
          change?.side === Side.NewFile ? newLine : oldLine;
        if (change && changeSideNumber === change.line_num) {
          hunkLines.push({
            oldLine: change.side === Side.NewFile ? null : oldLine,
            newLine: change.side === Side.NewFile ? newLine : null,
            change: change.change_type,
            content:
              change.side === Side.NewFile
                ? newLines[newLine - 1]
                : oldLines[oldLine - 1],
          });
          if (change.side === Side.NewFile) {
            newLine++;
          } else {
            oldLine++;
          }
          changeIdx++;
        } else {
          if (newLines[newLine - 1] !== oldLines[oldLine - 1]) {
            console.warn(
              "mismatched lines old vs new",
              oldLine,
              oldLines[oldLine - 1],
              newLine,
              newLines[newLine - 1]
            );
          }
          hunkLines.push({
            oldLine,
            newLine,
            change: null,
            content: newLines[newLine - 1],
          });
          newLine++;
          oldLine++;
        }
      }
    }
  }
</script>

<div>
  <h4>{hunk.header}</h4>
  <div>
    {#each hunkLines as line}
      <div
        class="line"
        class:added={line.change === "+"}
        class:removed={line.change === "-"}
      >
        <div class="line-num">{line.oldLine ?? ""}</div>
        <div class="line-num">{line.newLine ?? ""}</div>
        <div class="change">{line.change ?? ""}</div>
        <div>{line.content}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  h4 {
    color: darkgray;
    border-bottom: 1px solid;
  }
  .line {
    display: flex;
    gap: 10px;
    white-space: nowrap;
  }
  .line.added {
    background-color: #508050;
  }
  .line.removed {
    background-color: #805050;
  }
  .line-num {
    flex: 0 0 auto;
    width: 2rem;
    user-select: none;
  }
  .change {
    flex: 0 0 auto;
    width: 0.5rem;
    user-select: none;
  }
</style>
