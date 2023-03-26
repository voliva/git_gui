import { boxFill, verticalFlex } from "@/quickStyles.css";
import { style, styleVariants } from "@vanilla-extract/css";

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
