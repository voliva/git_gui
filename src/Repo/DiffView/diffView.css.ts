import { style } from "@vanilla-extract/css";

export const hunkHeaderContainer = style({
  display: "flex !important",
  alignItems: "flex-end",
  color: "#888",
  borderBottom: "1px solid",
  borderTop: "1px solid",
});

export const firstHunk = style({
  borderTop: "none",
});
