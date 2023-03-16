import {
  boxAuto,
  boxFill,
  textEllipsis,
  verticalFlex,
} from "@/quickStyles.css";
import { style, styleVariants } from "@vanilla-extract/css";
import { hoverBgColor } from "./RepoGrid/RepoGrid.css";

export const detailPanelContainer = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  width: "21rem",
  paddingLeft: "5px",
  borderLeft: "1px solid darkgray",
});

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

export const commitChangeContainer = style([
  boxFill,
  verticalFlex,
  {
    padding: "0 0.5rem",
    overflow: "hidden",
  },
]);

export const positiveColor = "#a0ffa0";
export const changeColor = "#ffd050";
export const neutralColor = "#a0a0ff";
export const negativeColor = "#ffa0a0";

export const insertions = style({
  color: positiveColor,
  marginLeft: "0.5rem",
});
export const deletions = style({
  color: negativeColor,
  marginRight: "0.5rem",
});
export const infographicBg = style({
  width: 50,
  height: 5,
  overflow: "hidden",
  backgroundColor: "#6f6f6f",
});
const infographicFgBase = style({
  height: "100%",
});
export const infographicFg = styleVariants({
  insertion: [
    infographicFgBase,
    {
      backgroundColor: positiveColor,
    },
  ],
  deletion: [
    infographicFgBase,
    {
      float: "right",
      backgroundColor: negativeColor,
    },
  ],
});

export const changeLine = style({
  display: "flex",
  overflow: "hidden",
  alignItems: "center",
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
