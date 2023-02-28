import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const content = style({
  flex: "1 1 auto",
  display: "flex",
  overflow: "hidden",
});
