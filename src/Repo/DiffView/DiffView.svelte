<script lang="ts">
  import * as monaco from "monaco-editor";
  import { onMount } from "svelte";
  import { diffDelta$, selectedDelta$, setDiffDelta } from "./diffViewState";
  import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
  import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
  import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
  import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
  import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
  import { getFileChangeFiles } from "../DetailPanel/activeCommitChangesState";
  import type { File } from "../DetailPanel/activeCommitChangesState";

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
    });
  });

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
      // https://github.com/microsoft/monaco-editor/issues/2707
      // https://stackoverflow.com/questions/57246356/how-to-highlight-merge-conflict-blocks-in-monaco-editor-like-vscode
      // https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1#example-interacting-with-the-editor-line-and-inline-decorations
      // console.log(
      //   "sha",
      //   (editor.getOriginalEditor() as any).setHiddenAreas([
      //     new monaco.Range(3, 1, 10, 1),
      //   ]),
      //   (editor.getModifiedEditor() as any).setHiddenAreas([
      //     new monaco.Range(3, 1, 10, 1),
      //   ])
      // );
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
    console.log(res);
    return res;
  }
</script>

<div class="diff-view">
  <div class="header">
    <button
      on:click={() =>
        editor.updateOptions({
          renderSideBySide: true,
        })}>Split</button
    >
    <button
      on:click={() =>
        editor.updateOptions({
          renderSideBySide: false,
        })}>Unified</button
    >
    <button>File</button>
    <button>Hunk</button>
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
</style>
