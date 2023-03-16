import { createVar, globalStyle } from "@vanilla-extract/css";

export const appBackground = createVar();
export const appForeground = createVar();

export const appBgColor = "#2f2f2f";

globalStyle(":root", {
  fontFamily:
    "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
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

globalStyle("::-webkit-scrollbar", {
  width: 7,
});
globalStyle("::-webkit-scrollbar-track", {
  background: "transparent",
});
globalStyle("::-webkit-scrollbar-thumb", {
  backgroundColor: "rgba(155, 155, 155, 0.5)",
  borderRadius: 20,
  border: "transparent",
});
