import classNames from "classnames";
import * as classes from "./quickStyles.css";

export function qs(...styles: Array<keyof typeof classes | null>) {
  return classNames(styles.map((key) => key && classes[key]));
}
