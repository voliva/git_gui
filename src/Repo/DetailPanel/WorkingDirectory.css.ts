import { deepBgColor } from "@/style.css";
import { style } from "@vanilla-extract/css";

export const workingDirectory = style({
  flex: "1 1 auto",
  display: "flex",
  flexDirection: "column",
  padding: "0.5rem",
  overflowY: "auto",
});

export const stagingListContainer = style({
  background: deepBgColor,
  marginBottom: "0.5rem",
  padding: "0.2rem",
  paddingBottom: "0.5rem",
  borderRadius: 5,
});

export const stagingListHeader = style({
  display: "flex",
  justifyContent: "space-between",
  padding: "0.2rem",
  overflowY: "scroll",
  userSelect: "none",
});

export const stagingList = style({
  overflowX: "clip",
  overflowY: "scroll",
  height: "10rem",
});

export const commitMessageArea = style({
  backgroundColor: deepBgColor,
  lineHeight: 1.5,
  color: "white",
  padding: "0.5rem",
  boxSizing: "border-box",
  width: "100%",
  minHeight: "5rem",
  height: "10rem",
  maxHeight: "20rem",
  resize: "vertical",
  borderRadius: "5px",
});

export const commitBtn = style({
  backgroundColor: "darkgreen",
  color: "white",
  borderRadius: "5px",
  marginTop: "1rem",
  padding: "0.5rem",
  borderColor: "rgba(118,118,118,0.3)",
  ":disabled": {
    opacity: 0.5,
  },
});

export const messageLength = style({
  color: "lightgray",
  textAlign: "right",
});
