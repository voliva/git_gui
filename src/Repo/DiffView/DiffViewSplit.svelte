<script lang="ts">
  import { type DeltaDiff, diffViewSettings$, Side } from "./diffViewState";
  import { getFileDiffLines, getHunkDiffLines } from "./diffLines";
  import DiffViewLines from "./DiffViewLines.svelte";
  import DiffViewHunk from "./DiffViewHunk.svelte";

  export let highlightedDelta: DeltaDiff;
  $: hunk_or_file = $diffViewSettings$?.hunk_or_file;
  $: fileLines =
    hunk_or_file === "File"
      ? [
          getFileDiffLines(highlightedDelta, Side.OldFile),
          getFileDiffLines(highlightedDelta, Side.NewFile),
        ]
      : null;
  $: hunks =
    hunk_or_file === "Hunk"
      ? highlightedDelta.hunks.map((hunk) => ({
          hunk,
          oldLines: getHunkDiffLines(highlightedDelta, hunk, Side.OldFile),
          newLines: getHunkDiffLines(highlightedDelta, hunk, Side.NewFile),
        }))
      : [];
</script>

{#if fileLines}
  <div class="split">
    <DiffViewLines lines={fileLines[0]} />
    <DiffViewLines lines={fileLines[1]} />
  </div>
{/if}

{#each hunks as hunk}
  <DiffViewHunk hunk={hunk.hunk}>
    <div class="split">
      <DiffViewLines lines={hunk.oldLines} side={Side.OldFile} />
      <DiffViewLines lines={hunk.newLines} side={Side.NewFile} />
    </div>
  </DiffViewHunk>
{/each}

<style>
  .split {
    display: flex;
    overflow: hidden;
  }
  .split > :global(div) {
    flex: 1 1 50%;
  }
</style>
