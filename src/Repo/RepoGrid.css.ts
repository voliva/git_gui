import { style } from "@vanilla-extract/css";

export const repoGrid = style({
  flex: "1 1 auto",
});

export const commitRow = style({
  width: "100%",
  display: "flex",
  textAlign: "left",
});

export const commitGraph = style({
  flex: "0 0 100%",
});
export const commitSummary = style({
  flex: "1 1 auto",
});

export const commitCell = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
