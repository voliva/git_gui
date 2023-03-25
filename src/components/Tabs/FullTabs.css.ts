import { boxSplit, textEllipsis } from "@/quickStyles.css";
import { style } from "@vanilla-extract/css";

export const fullTab = style([
  textEllipsis,
  boxSplit,
  {
    padding: "0.4rem",
    cursor: "pointer",
    userSelect: "none",
    background: "transparent",
    color: "white",
    border: "none",
    textAlign: "left",
    backgroundColor: "rgba(34,34,68,0.4)",
    selectors: {
      "&.active": {
        backgroundColor: "#222244",
      },
      "&.disabled": {
        opacity: 0.6,
        cursor: "default",
      },
    },
  },
]);
