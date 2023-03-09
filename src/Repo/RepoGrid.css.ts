import { style } from "@vanilla-extract/css";
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
  display: "flex",
});

export const activeCommitBgColor = "#101040";
export const activeCommitRow = style({
  background: activeCommitBgColor,
});

export const commitHeader = style({
  padding: "0px 0.2rem",
});

export const hoverBgColor = "#444444";
export const highlightOnHover = style({
  selectors: {
    [`${itemContainer}:hover &`]: {
      backgroundColor: hoverBgColor,
    },
    [`${itemContainer}${activeCommitRow}:hover &`]: {
      backgroundColor: activeCommitBgColor,
    },
  },
});
