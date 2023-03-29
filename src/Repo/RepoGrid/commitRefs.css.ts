import { style } from "@vanilla-extract/css";

export const repoGridRow = style({});

export const commitRefs = style({
  flex: "0 0 auto",
  width: "120px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "0.2rem",
  zIndex: 1, // Above commit message when overflowing
  // For hosting multi-tags
  alignSelf: "flex-start",
  marginTop: 5,
});

export const commitTagGroup = style({
  fontSize: "0.8rem",
  lineHeight: 1,
  display: "inline-flex",
  background: "white",
  color: "black",
  borderRadius: 5,
  padding: "0.2rem",
  alignItems: "center",
  gap: "0.2rem",
  maxWidth: "100%",
  boxSizing: "border-box",
  boxShadow: "0px 1px 5px 0px rgba(0,0,0,0.75)",
  ":hover": {
    maxWidth: "initial",
  },
  // Transition on hover
  opacity: 0, // we will make them gradually opaque
  selectors: {
    // Only do transition if the row is being hovered: otherwise elements might go under other rows.
    [`${repoGridRow}:hover &`]: {
      transition: "0.2s transform, 0.2s opacity",
    },
    ...Object.fromEntries(
      new Array(10).fill(0).map((_, i) => [
        `&:nth-child(${i + 1})`,
        {
          transform: `translate(${-2 * i}px, ${-20 * i}px)`,
          zIndex: 5 - i, // Order them in reverse
          opacity: 1 - i * 0.3,
        },
      ])
    ),
    // When hovering over the refs block, reset all positions to their original.
    [`${commitRefs}:hover &`]: {
      transform: "translate(0, 0)",
      opacity: 1,
    },
  },
});
