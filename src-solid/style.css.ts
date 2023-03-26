import { createVar, globalStyle, style } from "@vanilla-extract/css";

export const appBackground = createVar();
export const appForeground = createVar();

export const appBgColor = "#2f2f2f";
export const deepBgColor = "#1f1f1f";

export const fontFamily =
  "Monaco, ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace";

// https://github.com/vjpr/monaco-bold
// https://stackoverflow.com/a/62755574/1026619
globalStyle(":root", {
  fontFamily,
  fontSize: "14px",
  lineHeight: "24px",
  fontWeight: "400",

  color: appForeground,
  backgroundColor: appBackground,

  fontSynthesis: "none",
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  WebkitTextSizeAdjust: "100%",

  vars: {
    [appBackground]: appBgColor,
    [appForeground]: "#f6f6f6",
  },
});

globalStyle("html, body", {
  margin: 0,
  overflow: "hidden",
});

globalStyle("#root", {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  maxHeight: "100vh",
});

globalStyle("a", {
  fontWeight: 500,
  color: "#646cff",
  textDecoration: "inherit",
});

globalStyle("a:hover", {
  color: "#24c8db",
});

globalStyle("svg", {
  outline: "none",
});

globalStyle("h1, h2, h3, h4, h5, p", {
  margin: "0",
});

globalStyle("ul, ol", {
  listStyle: "none",
  padding: 0,
  margin: 0,
});

globalStyle(".tippy-box", {
  background: "#0f0f0f",
});
globalStyle(".tippy-arrow", {
  color: "#0f0f0f",
});
globalStyle(".tippy-content", {
  wordBreak: "break-word",
});

globalStyle("::-webkit-scrollbar", {
  width: 7,
  height: 7,
});
globalStyle("::-webkit-scrollbar-track", {
  background: "transparent",
});
globalStyle("::-webkit-scrollbar-thumb", {
  backgroundColor: "rgba(155, 155, 155, 0.5)",
  borderRadius: 20,
  border: "transparent",
});

globalStyle("button", {
  fontFamily,
});

/*
CASE annoying eslint solid/reactivity: It doesn't understand `onClick` as event handlers.
I tried moving this into a component, but then when using `async () => ` it complained it won't track reactivity. An event handler is shouldn't track.
*/
export const buttonLink = style({
  display: "inline",
  padding: "0",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: "500",

  color: "#646cff",
  ":hover": {
    color: "#24c8db",
  },
});
