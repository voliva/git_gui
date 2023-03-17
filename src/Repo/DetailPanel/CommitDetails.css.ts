import { boxAuto } from "@/quickStyles.css";
import { style } from "@vanilla-extract/css";

export const commitDetails = style([
  boxAuto,
  {
    padding: "0.5rem",
  },
]);

export const commitText = style({
  background: "#1f1f1f",
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
  background: "#1f1f1f",
  borderRadius: 5,
  padding: "0.2rem 0.5rem",
  gap: "0.5rem",
});
