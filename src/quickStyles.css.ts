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

export const flexGap = style({
  gap: "0.3rem",
});

export const centeredFlex = style({
  alignItems: "center",
});

export const spaceBetweenFlex = style({
  justifyContent: "space-between",
});

export const boxFill = style({
  flex: "1 1 auto",
});

export const boxAuto = style({
  flex: "0 0 auto",
});

export const boxSplit = style({
  flex: "1 1 100%",
});

export const noOverflow = style({
  overflow: "hidden",
});

export const overflowAuto = style({
  overflow: "auto",
});

export const overflowVertical = style({
  overflowX: "clip",
  overflowY: "auto",
});

export const alignRight = style({
  textAlign: "right",
});
