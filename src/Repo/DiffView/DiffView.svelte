<script lang="ts">
  import * as monaco from "monaco-editor";
  import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
  import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
  import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
  import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
  import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
  import { onDestroy, onMount } from "svelte";
  import type { File } from "../DetailPanel/activeCommitChangesState";
  import { getFileChangeFiles } from "../DetailPanel/activeCommitChangesState";
  import {
    getHiddenRanges,
    setHiddenAreas,
    viewZoneSetter,
  } from "./diffViewHunks";
  import {
    changeHunkOrFile,
    changeSplitOrUnified,
    diffDelta$,
    diffViewSettings$,
    selectedDelta$,
    setDiffDelta,
  } from "./diffViewState";
  import ButtonGroup from "@/components/ButtonGroup.svelte";
  import classNames from "classnames";

  self.MonacoEnvironment = {
    getWorker: function (_, label) {
      if (label === "typescript" || label === "javascript")
        return new TsWorker();
      if (label === "json") return new JsonWorker();
      if (label === "css") return new CssWorker();
      if (label === "html") return new HtmlWorker();
      return new EditorWorker();
    },
  };

  let container: HTMLDivElement | undefined = undefined;

  let editor: monaco.editor.IStandaloneDiffEditor;
  onMount(() => {
    editor = monaco.editor.createDiffEditor(container!, {
      theme: "vs-dark",
      renderSideBySide: true,
      enableSplitViewResizing: true,
      scrollBeyondLastLine: false,
      readOnly: true,
      domReadOnly: true,
      automaticLayout: true,
      showDeprecated: false,
      showUnused: false,
      // In an attempt to hide all hints...
      inlayHints: { enabled: "off" },
      parameterHints: { enabled: false },
      codeLens: false,
      quickSuggestions: false,
      inlineSuggest: {
        enabled: false,
      },
      lightbulb: {
        enabled: false,
      },
      contextmenu: false,
      // Ended up through css .monaco-editor .squiggly-hint
    });
  });

  $: {
    editor?.updateOptions({
      renderSideBySide: $diffViewSettings$?.split_or_unified === "Split",
    });
  }
  $: {
    if ($diffDelta$ && editor && $selectedDelta$) {
      const [old_file, new_file] = getFileChangeFiles($selectedDelta$.change);

      monaco.editor.getModels().forEach((model) => model.dispose());
      editor.setModel({
        original: monaco.editor.createModel(
          $diffDelta$.old_file ?? "",
          undefined,
          getFileUri(old_file, "old")
        ),
        modified: monaco.editor.createModel(
          $diffDelta$.new_file ?? "",
          undefined,
          getFileUri(new_file, "new")
        ),
      });
    }
  }

  let cleanupPreviousViewzones = () => {};
  onDestroy(cleanupPreviousViewzones);
  $: {
    if ($diffDelta$ && editor) {
      const originalEditor = editor.getOriginalEditor();
      const modifiedEditor = editor.getModifiedEditor();

      if ($diffViewSettings$.hunk_or_file === "Hunk") {
        const hunks = $diffDelta$.hunks;

        const originalHiddenRanges = getHiddenRanges(
          hunks.map((h) => h.old_range),
          originalEditor.getModel()!.getLineCount()
        );
        const modifiedHiddenRanges = getHiddenRanges(
          hunks.map((h) => h.new_range),
          modifiedEditor.getModel()!.getLineCount()
        );

        setHiddenAreas(originalEditor, originalHiddenRanges);
        setHiddenAreas(modifiedEditor, modifiedHiddenRanges);

        cleanupPreviousViewzones();
        const [originalVZ, cleanupOriginalVZ] = viewZoneSetter(
          hunks.map((h) => ({
            header: h.header,
            range: h.old_range,
          }))
        );
        const [modifiedVZ, cleanupModifiedVZ] = viewZoneSetter(
          hunks.map((h) => ({
            header: h.header,
            range: h.new_range,
          }))
        );
        originalEditor.changeViewZones(originalVZ);
        modifiedEditor.changeViewZones(modifiedVZ);
        cleanupPreviousViewzones = () => {
          originalEditor.changeViewZones(cleanupOriginalVZ);
          modifiedEditor.changeViewZones(cleanupModifiedVZ);
          cleanupPreviousViewzones = () => {};
        };
      } else {
        setHiddenAreas(originalEditor, []);
        setHiddenAreas(modifiedEditor, []);
        cleanupPreviousViewzones();
      }
    }
  }

  function getFileUri(
    file: File | null,
    version: "new" | "old"
  ): monaco.Uri | undefined {
    if (!file) return undefined;

    const res = monaco.Uri.file(file.path).with({
      query: version,
    });
    return res;
  }
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
    <button on:click={() => setDiffDelta(null)}>Close</button>
  </div>
  <div class="monaco-container" bind:this={container} />
</div>

<style>
  .diff-view {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }

  .header {
    text-align: right;
  }

  .monaco-container {
    flex: 1 1 auto;
  }

  :global(.view-zones) {
    /* So deleted lines overlays are physically above regular lines */
    z-index: 1;
  }
  :global(
      .monaco-editor.no-user-select .lines-content,
      .monaco-editor.no-user-select .view-line,
      .monaco-editor.no-user-select .view-lines
    ) {
    /* So deleted lines can be selected */
    user-select: auto;
  }
  :global(.line-numbers) {
    /* So line numbers won't be selected when starting selection from deleted */
    user-select: none;
  }
  :global(.monaco-editor .line-delete .view-line) {
    /* So Ctrl+C keeps new lines */
    position: static;
  }
  :global(.monaco-editor .squiggly-hint) {
    display: none;
  }
</style>
