<script lang="ts">
  import * as monaco from "monaco-editor";
  import { onMount } from "svelte";
  import { diffDelta$ } from "./diffViewState";

  self.MonacoEnvironment = {
    getWorker: function (workerId, label) {
      const getWorkerModule = (moduleUrl: string, label: string) => {
        return new Worker(
          self.MonacoEnvironment!.getWorkerUrl!(moduleUrl, label),
          {
            name: label,
            type: "module",
          }
        );
      };

      switch (label) {
        case "json":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/json/json.worker?worker",
            label
          );
        case "css":
        case "scss":
        case "less":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/css/css.worker?worker",
            label
          );
        case "html":
        case "handlebars":
        case "razor":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/html/html.worker?worker",
            label
          );
        case "typescript":
        case "javascript":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/typescript/ts.worker?worker",
            label
          );
        default:
          return getWorkerModule(
            "/monaco-editor/esm/vs/editor/editor.worker?worker",
            label
          );
      }
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
    });
  });

  $: {
    if ($diffDelta$ && editor) {
      /**
       * Svelte
       * https://www.npmjs.com/package/monaco-editor-textmate
       * https://www.npmjs.com/package/monaco-textmate
       */
      editor.setModel({
        original: monaco.editor.createModel(
          $diffDelta$.old_file ?? "",
          "svelte"
        ),
        modified: monaco.editor.createModel(
          $diffDelta$.new_file ?? "",
          "svelte"
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
</script>

<div class="diff-view" bind:this={container} />

<style>
  .diff-view {
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
