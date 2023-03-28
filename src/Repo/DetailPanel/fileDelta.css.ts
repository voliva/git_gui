import { textEllipsis } from "@/quickStyles.css";
import { style } from "@vanilla-extract/css";
import { hoverBgColor } from "../RepoGrid/gridConstants";

export const detailPanelContainer = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  width: "23rem",
  paddingLeft: "5px",
  borderLeft: "1px solid darkgray",
});

export const changeLine = style({
  display: "flex",
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.2rem",
  cursor: "pointer",
  ":hover": {
    background: hoverBgColor,
  },
});
export const changeIcon = style({
  display: "inline-flex",
  marginRight: "0.5rem",
});

export const filePathDirectory = style([
  textEllipsis,
  {
    flex: "1 1 0%",
    maxWidth: "fit-content",
    minWidth: "3rem",
  },
]);
export const filePathName = style([
  textEllipsis,
  {
    flex: "0 1 auto",
  },
]);
