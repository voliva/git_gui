<script lang="ts">
  import { type DeltaDiff, diffViewSettings$ } from "./diffViewState";
  import { getFileDiffLines, getHunkDiffLines } from "./diffLines";
  import DiffViewLines from "./DiffViewLines.svelte";
  import DiffViewHunk from "./DiffViewHunk.svelte";

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
  <DiffViewHunk hunk={hunk.hunk}>
    <DiffViewLines lines={hunk.lines} />
  </DiffViewHunk>
{/each}
