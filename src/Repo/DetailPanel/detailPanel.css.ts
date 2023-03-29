import { style } from "@vanilla-extract/css";
import { deepBgColor } from "@/style.css";

export const detailPanelContainer = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  width: "23rem",
  borderLeft: "1px solid darkgray",
  flex: "0 0 auto",
});

export const commitText = style({
  background: deepBgColor,
  borderRadius: 5,
  padding: "0.5rem",
  maxHeight: "100px",
  overflowY: "auto",
  overflowX: "clip",
});

export const commitAuthor = style({
  display: "flex",
  margin: "0.5rem 0",
  alignItems: "center",
  overflow: "hidden",
  background: deepBgColor,
  borderRadius: 5,
  padding: "0.2rem 0.5rem",
  gap: "0.5rem",
});
