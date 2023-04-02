<script lang="ts">
  import * as monaco from "monaco-editor";
  import { onMount } from "svelte";
  import { diffDelta$ } from "./diffViewState";
  import { loadWASM } from "onigasm";
  import { Registry } from "monaco-textmate";
  import { wireTmGrammars } from "monaco-editor-textmate";
  import onigasm from "onigasm/lib/onigasm.wasm?url";
  import grammer from "./svelte.tmLanguage.json?url";

  /**
   * Dropping the whole svelte highlighting stuff. It's taking too long and I want to move on.
   * Current thoughts:
   * 1. monaco-editor doesn't feel fully right for the job
   *  -> This is all not about editing stuff, but showing diffs.
   *  -> Or maybe yes? Might become useful to solve conflicts locally in a future.
   *  -> Or to solve conflicts you use your own editor.
   * 2. monaco-editor recalculates the diff
   *  -> Good part is that it can highlight what actually changed within a line
   *  -> Not sure how to do that with libgit2
   *  -> Can it be problematic for later staging/unstaging lines or hunks?
   *  -> Can it be problematic if there's a different diff config between monaco-editor and libgit2?
   * 3. Alternative Prism.js
   *  -> Has diff + language support.
   *  -> Has svelte language support.
   * 4. Alternative highlight.js
   *  -> Comunity says it's better, but I find it hard to know what actually supports and how easy is to customise.
   * 5. What would be great is to have a library that does the highlighting, but headless
   *  -> Then I can arrange the lines as I need to.
   * 6. But then inline-editing, can I just throw a monaco-editor and have different highlight styles? eww
   *
   * Tabs opened:
   * https://github.com/zikaari/monaco-editor-textmate
   * https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
   * https://github.com/asafamr/svelte-vscode-web/search?q=tmLanguage
   * https://github.com/asafamr/svelte-vscode-web/blob/master/package.json
   * https://github.com/sveltejs/language-tools/blob/master/packages/svelte-vscode/language-configuration.json
   * https://github.com/sveltejs/language-tools/blob/master/packages/svelte-vscode/syntaxes/svelte.tmLanguage.src.yaml#L574
   * https://microsoft.github.io/monaco-editor/playground.html?source=v0.36.1#example-extending-language-services-custom-languages
   * https://github.com/microsoft/monaco-editor/issues/3237
   * https://github.com/highlightjs/highlight.js
   * https://highlightjs.org/static/demo/
   * https://prismjs.com/
   * https://github.com/PrismJS/prism/issues/2090
   * https://github.com/pngwn/prism-svelte
   * https://github.com/PrismJS/prism/issues/2238
   * https://prismjs.com/plugins/diff-highlight/
   */

  self.MonacoEnvironment = {
    getWorker: function (_, label) {
      const getWorkerModule = (moduleUrl: string, label: string) => {
        return new Worker(
          self.MonacoEnvironment!.getWorkerUrl!(moduleUrl, label),
          {
            name: label,
            type: "module",
          }
        );
      };

      return getWorkerModule(
        "/monaco-editor/esm/vs/editor/editor.worker?worker",
        label
      );
    },
  };

  // from https://github.com/sveltejs/language-tools/blob/master/packages/svelte-vscode/language-configuration.json
  const languageConfig: monaco.languages.LanguageConfiguration = {
    comments: {
      blockComment: ["<!--", "-->"],
    },
    brackets: [
      ["<!--", "-->"],
      ["<", ">"],
      ["{", "}"],
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
      { open: "`", close: "`", notIn: ["comment", "string"] },
      { open: "<!--", close: "-->", notIn: ["comment", "string"] },
      { open: "/**", close: "*/", notIn: ["string"] },
    ],
    autoCloseBefore: ";:.,=}])><`/ \n\t",
    surroundingPairs: [
      { open: "'", close: "'" },
      { open: '"', close: '"' },
      { open: "`", close: "`" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "<", close: ">" },
    ],
    folding: {
      markers: {
        start: new RegExp(
          "^\\s*//\\s*#?region\\b|^<(template|style|script)[^>]*>|^\\s*<!--\\s*#region\\b"
        ),
        end: new RegExp(
          "^\\s*//\\s*#?endregion\\b|^</(template|style|script)>|^\\s*<!--\\s*#endregion\\b"
        ),
      },
    },
  };
  monaco.languages.register({
    id: "svelte",
    aliases: ["Svelte", "svelte"],
    extensions: [".svelte"],
  });
  monaco.languages.setLanguageConfiguration("svelte", languageConfig);

  async function loadGrammer() {
    console.log("Loading");
    await loadWASM(onigasm);
    console.log("Loaded!");

    const registry = new Registry({
      getGrammarDefinition: async (scopeName) => {
        return {
          format: "json",
          content: await (await fetch(grammer)).text(),
        };
      },
    });

    // map of monaco "language id's" to TextMate scopeNames
    // referencing https://github.com/asafamr/svelte-vscode-web/blob/master/package.json
    const grammars = new Map();
    grammars.set("css", "source.css");
    grammars.set("html", "text.html.basic");
    grammars.set("typescript", "source.ts");
    grammars.set("javascript", "source.js");

    // monaco's built-in themes aren't powereful enough to handle TM tokens
    // https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
    // monaco.editor.defineTheme('vs-code-theme-converted', {
    //     // ... use `monaco-vscode-textmate-theme-converter` to convert vs code theme and pass the parsed object here
    // });

    // var editor = monaco.editor.create(document.getElementById('container'), {
    //     value: [
    //         'html, body {',
    //         '    margin: 0;',
    //         '}'
    //     ].join('\n'),
    //     language: 'css', // this won't work out of the box, see below for more info,
    //     theme: 'vs-code-theme-converted' // very important, see comment above
    // })

    await wireTmGrammars(monaco, registry, grammars, editor as any);
    console.log("Wired up!");
  }

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
    loadGrammer();
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
