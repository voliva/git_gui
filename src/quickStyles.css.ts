import { style } from "@vanilla-extract/css";

export const textEllipsis = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const verticalFlex = style({
  display: "flex",
  flexDirection: "column",
});

export const horizontalFlex = style({
  display: "flex",
});

export const boxFill = style({
  flex: "1 1 auto",
});

export const boxAuto = style({
  flex: "0 0 auto",
});

export const noOverflow = style({
  overflow: "hidden",
});
