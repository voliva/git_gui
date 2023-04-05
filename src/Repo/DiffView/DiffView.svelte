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
      showDeprecated: false,
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

  let hunksOrFile: "hunks" | "file" = "hunks";
  $: {
    if ($diffDelta$ && editor && $selectedDelta$) {
      console.log("recompute");

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

      // TODO split reactivity for hunks/file and the actual changes.
      (editor.getOriginalEditor() as any).setHiddenAreas([]);
      (editor.getModifiedEditor() as any).setHiddenAreas([]);
      if (hunksOrFile === "hunks") {
        const hunks = $diffDelta$.hunks;
        let previousLine = [1, 1];
        const originalHiddenRanges: Array<monaco.Range> = [];
        const modifiedHiddenRanges: Array<monaco.Range> = [];
        hunks.forEach((hunk) => {
          if (previousLine[0] < hunk.old_range[0]) {
            originalHiddenRanges.push(
              new monaco.Range(previousLine[0], 1, hunk.old_range[0] - 1, 1)
            );
          }
          if (previousLine[1] < hunk.new_range[0]) {
            modifiedHiddenRanges.push(
              new monaco.Range(previousLine[1], 1, hunk.new_range[0] - 1, 1)
            );
          }
          previousLine = [
            hunk.old_range[0] + hunk.old_range[1],
            hunk.new_range[0] + hunk.new_range[1],
          ];
        });
        // const originalLines = editor
        //   .getOriginalEditor()
        //   .getModel()!
        //   .getLineCount();
        // const modifiedLines = editor
        //   .getModifiedEditor()
        //   .getModel()!
        //   .getLineCount();
        // originalHiddenRanges.push(
        //   new monaco.Range(previousLine[0], 1, originalLines, 1)
        // );
        // modifiedHiddenRanges.push(
        //   new monaco.Range(previousLine[1], 1, modifiedLines, 1)
        // );

        editor.getOriginalEditor().changeViewZones((accesor) => {
          hunks.forEach((hunk, i) => {
            const div = document.createElement("div");
            div.innerHTML = hunk.header;
            const zone: monaco.editor.IViewZone = {
              afterLineNumber: i === 0 ? 0 : hunks[i].old_range[0] - 1,
              heightInLines: 2,
              domNode: div,
              afterColumn: 1e4,
            };
            console.log("original", i, zone);
            accesor.addZone(zone);
          });
        });
        editor.getModifiedEditor().changeViewZones((accesor) => {
          hunks.forEach((hunk, i) => {
            const div = document.createElement("div");
            div.innerHTML = hunk.header;
            const zone: monaco.editor.IViewZone = {
              afterLineNumber: i === 0 ? 0 : hunks[i].new_range[0] - 1,
              heightInLines: 2,
              domNode: div,
              afterColumn: 1e4,
            };
            console.log("modified", i, zone);
            accesor.addZone(zone);
          });
        });

        (window as any).triggerChange = () => {
          console.log(originalHiddenRanges, modifiedHiddenRanges);
          (editor.getOriginalEditor() as any).setHiddenAreas(
            originalHiddenRanges
          );
          (editor.getModifiedEditor() as any).setHiddenAreas(
            modifiedHiddenRanges
          );
        };
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
    <button on:click={() => (hunksOrFile = "file")}>File</button>
    <button on:click={() => (hunksOrFile = "hunks")}>Hunk</button>
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
