<script lang="ts">
  import ButtonGroup from "@/components/ButtonGroup.svelte";
  import classNames from "classnames";
  import { filter, map, withLatestFrom } from "rxjs";
  import {
    changeHunkOrFile,
    changeSplitOrUnified,
    diffDelta$,
    diffViewSettings$,
    selectedDelta$,
    setDiffDelta,
    type DeltaDiff,
  } from "./diffViewState";
  import {
    getFileChangeFiles,
    type File,
  } from "../DetailPanel/activeCommitChangesState";
  import { highlightSyntax } from "./highlightSyntax";
  import DiffViewUnified from "./DiffViewUnified.svelte";
  import DiffViewSplit from "./DiffViewSplit.svelte";
  import { viewHistory } from "../History/historyState";
  import { activeCommit$ } from "../RepoGrid/activeCommit";

  const highlightedDelta$ = diffDelta$.pipeState(
    filter((delta) => !!delta),
    withLatestFrom(
      selectedDelta$.pipe(map((v) => (v ? getFileChangeFiles(v.change) : [])))
    ),
    map(([result, fileChanges]): DeltaDiff => {
      const highlight = (src: string | undefined, file: File | null) => {
        if (!src) return "";
        const extension =
          file?.path.slice(file.path.lastIndexOf(".") + 1) ?? "";
        return highlightSyntax(src, extension);
      };

      return {
        ...result!,
        new_file: highlight(result?.new_file, fileChanges[1]),
        old_file: highlight(result?.old_file, fileChanges[0]),
      };
    })
  );

  $: files = getFileChangeFiles($selectedDelta$!.change);
</script>

<div class="diff-view">
  <div class="header">
    <ButtonGroup>
      <button
        class={classNames({
          active: $diffViewSettings$?.split_or_unified == "Split",
        })}
        on:click={() => changeSplitOrUnified("Split")}>Split</button
      >
      <button
        class={classNames({
          active: $diffViewSettings$?.split_or_unified == "Unified",
        })}
        on:click={() => changeSplitOrUnified("Unified")}>Unified</button
      >
    </ButtonGroup>
    <ButtonGroup>
      <button
        class={classNames({
          active: $diffViewSettings$?.hunk_or_file == "File",
        })}
        on:click={() => changeHunkOrFile("File")}>File</button
      >
      <button
        class={classNames({
          active: $diffViewSettings$?.hunk_or_file == "Hunk",
        })}
        on:click={() => changeHunkOrFile("Hunk")}>Hunk</button
      >
    </ButtonGroup>
    <button
      on:click={() =>
        viewHistory({
          filePath: files[1]?.path ?? files[0]?.path ?? "",
          commitId: $activeCommit$ ?? undefined,
        })}>History</button
    >
    <button on:click={() => setDiffDelta(null)}>Close</button>
  </div>
  <div class="diff-container">
    {#if $highlightedDelta$}
      {#if $diffViewSettings$?.split_or_unified == "Unified"}
        <DiffViewUnified highlightedDelta={$highlightedDelta$} />
      {:else}
        <DiffViewSplit highlightedDelta={$highlightedDelta$} />
      {/if}
    {/if}
  </div>
</div>

<style>
  .diff-view {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    text-align: right;
  }

  .diff-container {
    flex: 1 1 auto;
    overflow: auto;

    /* From prism's theme */
    color: #ccc;
    background: #2d2d2d;
    font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
    font-size: 1rem;
    text-align: left;
  }
</style>
