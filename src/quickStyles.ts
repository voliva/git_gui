import classNames from "classnames";
import * as classes from "./quickStyles.css";

export function qs(...styles: Array<keyof typeof classes>) {
  return classNames(styles.map((key) => classes[key]));
}
