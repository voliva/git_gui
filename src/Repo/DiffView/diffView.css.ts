import { appBackground, appForeground } from "@/style.css";
import { style } from "@vanilla-extract/css";

export const hunkHeaderContainer = style({
  display: "flex !important",
  alignItems: "flex-end",
  color: "#444",
  borderBottom: "thin solid",
  borderTop: "thin solid",

  // Taken from monaco, but shifted so it's different
  backgroundImage: `linear-gradient(
    45deg,
    rgba(204, 204, 204, 0.1) 12.5%,
    #0000 12.5%, #0000 50%,
    rgba(204, 204, 204, 0.1) 50%, rgba(204, 204, 204, 0.1) 62.5%,
    #0000 62.5%, #0000 100%
    )`,
  backgroundSize: "6px 6px",
});

export const firstHunk = style({
  borderTop: "none",
});

export const hunkHeaderContent = style({
  background: `var(--vscode-editorGutter-background, ${appBackground})`,
  width: "100%",
  color: appForeground,
  opacity: 0.66,
});
