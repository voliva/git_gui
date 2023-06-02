import { deepBgColor } from "@/style.css";
import { style } from "@vanilla-extract/css";

export const historyCommit = style({
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  background: deepBgColor,
  borderRadius: 5,
  padding: "0.2rem 0.5rem",
  gap: "0.5rem",
  cursor: "pointer",
  border: "thin solid transparent",
});
