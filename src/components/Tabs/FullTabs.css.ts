import { boxSplit, textEllipsis } from "@/quickStyles.css";
import { style } from "@vanilla-extract/css";

export const fullTab = style([
  textEllipsis,
  boxSplit,
  {
    padding: "0.2rem 0.4rem",
    cursor: "pointer",
    userSelect: "none",
    selectors: {
      "&.active": {
        backgroundColor: "#222244",
      },
    },
  },
]);
