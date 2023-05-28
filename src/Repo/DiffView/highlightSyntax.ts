import Prism from "prismjs";
import "prism-svelte";
import "prismjs/themes/prism-tomorrow.css";

Prism.manual = true;

export function highlightSyntax(code: string, extension: string) {
  const language = languageFromFileExtension[extension] ?? "plaintext";

  return Prism.highlight(code, Prism.languages[language], language);
}

const languageFromFileExtension: Record<string, string> = {
  /// Bundled with Prismjs
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "svg",
  rss: "rss",
  css: "css",
  // clike
  js: "javascript",
  /// My pick
  ts: "typescript",
  tsx: "tsx",
  jsx: "jsx",
  rs: "rust",
  feature: "gherkin",
  svelte: "svelte",
  json: "javascript",
  diff: "diff",
  patch: "diff",
  /// Popular
  py: "python",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  php: "php",
  cs: "csharp",
  swift: "swift",
  kt: "kotlin",
  go: "go",
};
