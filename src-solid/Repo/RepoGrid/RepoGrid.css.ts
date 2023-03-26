import { style } from "@vanilla-extract/css";
import { itemContainer } from "@/components/Grid/Grid.css";

export const repoGridRow = style({
  cursor: "pointer",
  ":hover": {
    zIndex: 1, // Above other rows,
    contain: "none !important",
  },
});

export const commitGraph = style({
  flex: "0 0 100%",
});

export const activeCommitBgColor = "#222244";
export const activeCommitRow = style({
  background: activeCommitBgColor,
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
