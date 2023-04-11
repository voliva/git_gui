import { globalStyle } from "@vanilla-extract/css";
import { style } from "@vanilla-extract/css";

export const imgBackground = style({
  backgroundImage: `linear-gradient(
        45deg,
        #aaa 12.5%,
        #666 12.5%,
        #666 50%,
        #aaa 50%,
        #aaa 62.5%,
        #666 62.5%,
        #666 100%
      )`,
  backgroundSize: "12px 12px",
});

export const absoluteFull = style({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
});

export const slideImage = style([
  absoluteFull,
  imgBackground,
  {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
]);

globalStyle(`${slideImage} img`, {
  maxWidth: "100%",
  maxHeight: "100%",
});

export const slideImageHeader = style({
  padding: "0 0.5rem",
  background: "rgba(0, 0, 0, 0.8)",
});
