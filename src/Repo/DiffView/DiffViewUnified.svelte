<script lang="ts">
  import { type DeltaDiff, diffViewSettings$ } from "./diffViewState";
  import { getFileDiffLines, getHunkDiffLines } from "./diffLines";
  import DiffViewLines from "./DiffViewLines.svelte";

  export let highlightedDelta: DeltaDiff;
  $: hunk_or_file = $diffViewSettings$?.hunk_or_file;
  $: fileLines =
    hunk_or_file === "File" ? getFileDiffLines(highlightedDelta, null) : null;
  $: hunks =
    hunk_or_file === "Hunk"
      ? highlightedDelta.hunks.map((hunk) => ({
          hunk,
          lines: getHunkDiffLines(highlightedDelta, hunk, null),
        }))
      : [];
</script>

{#if fileLines}
  <DiffViewLines lines={fileLines} />
{/if}

{#each hunks as hunk}
  <div>
    <div>{hunk.hunk.header}</div>
    <DiffViewLines lines={hunk.lines} />
    <hr />
  </div>
{/each}
