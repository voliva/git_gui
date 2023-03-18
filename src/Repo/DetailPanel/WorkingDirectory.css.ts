import { deepBgColor } from "@/style.css";
import { style } from "@vanilla-extract/css";

export const workingDirectory = style({
  flex: "1 1 auto",
  display: "flex",
  flexDirection: "column",
  padding: "0.5rem",
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
});

export const stagingList = style({
  overflowX: "clip",
  overflowY: "scroll",
  height: "10rem",
});
