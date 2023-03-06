import { globalStyle, style } from "@vanilla-extract/css";
import { itemContainer } from "@/components/Grid/Grid.css";

export const repoGrid = style({
  flex: "1 1 auto",
});

export const commitGraph = style({
  flex: "0 0 100%",
});

export const commitCell = style({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  padding: "0px 0.2rem",
});

export const commitHeader = style({
  padding: "0px 0.2rem",
});

export const highlightOnHover = style({
  selectors: {
    [`${itemContainer}:hover &`]: {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
  },
});
