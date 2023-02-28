import { style } from "@vanilla-extract/css";

export const gridContainer = style({
  overflow: "auto",
  userSelect: "none",
  WebkitUserSelect: "none",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  vars: {
    "--default-grid-bg": "var(--app-background)",
  },
  "::-webkit-scrollbar": {
    display: "none",
  },
});

export const headerContainer = style({
  position: "sticky",
  top: 0,
  display: "flex",
  backgroundColor: "var(--grid-bg, var(--default-grid-bg))",
  zIndex: 1, // Above virtualContainer
  boxShadow: "0px 1px 5px var(--grid-bg, var(--default-grid-bg))",
});

export const virtualContainer = style({
  zIndex: 0, // Below headerContainer
});

export const itemContainer = style({
  width: "100%",
  display: "flex",
  backgroundColor: "var(--grid-bg, var(--default-grid-bg))",
});

export const cellAuto = style({
  flex: "1 1 1%",
  width: 0, // Allows for flex items to not overflow without having overflow: hidden
  display: "flex",
  position: "relative",
  alignItems: "center",
});

export const cellFixed = style({
  flex: "0 0 1%",
  width: 0,
  display: "flex",
  position: "relative",
  alignItems: "center",
});

export const resizer = style({
  cursor: "col-resize",
  position: "absolute",
  right: 0,
  top: "3px",
  bottom: "3px",
  width: "3px",
  borderLeft: "1px solid white",
});
