import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { prismjsPlugin } from "vite-plugin-prismjs";
import sveltePreprocess from "svelte-preprocess";
import eslint from "vite-plugin-eslint";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    svelte({
      preprocess: [
        sveltePreprocess({
          typescript: true,
        }),
      ],
    }),
    vanillaExtractPlugin(),
    eslint({
      failOnWarning: !process.env.TAURI_DEBUG,
      failOnError: !process.env.TAURI_DEBUG,
    }),
    prismjsPlugin({
      languages: [
        // My personal pick :)
        "typescript",
        "tsx",
        "jsx",
        "rust",
        "gherkin",
        "diff",
        // Other popular, based on a post from analyticsinsight
        "python",
        "java",
        "c",
        "cpp",
        "php",
        "csharp",
        "swift",
        "kotlin",
        "go",
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}));
