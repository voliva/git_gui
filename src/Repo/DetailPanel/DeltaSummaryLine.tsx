import {
  OcFileadded2,
  OcFilediff2,
  OcFilemoved2,
  OcFileremoved2,
  OcFilesymlinkfile2,
} from "solid-icons/oc";
import { createSignal, JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useTippy } from "solid-tippy";
import { Delta, File, FileChange } from "./ActiveCommitChanges";
import {
  changeColor,
  negativeColor,
  neutralColor,
  positiveColor,
} from "./ActiveCommitChanges.css";
import * as classes from "./DeltaSummaryLine.css";

export const DeltaSummary = (props: {
  delta: Delta;
  children?: JSX.Element;
}) => {
  const getFile = () =>
    switchChangeType(props.delta.change, {
      Added: ([v]) => v,
      Untracked: ([v]) => v,
      Copied: ([, v]) => v,
      Deleted: ([v]) => v,
      Renamed: ([, v]) => v,
      Modified: ([, v]) => v,
    });
  const getIcon = () =>
    switchChangeType(props.delta.change, {
      Added: () => OcFileadded2,
      Untracked: () => OcFileadded2, // TODO
      Copied: () => OcFilesymlinkfile2,
      Deleted: () => OcFileremoved2,
      Renamed: () => OcFilemoved2,
      Modified: () => OcFilediff2,
    });
  const getStyle = () =>
    switchChangeType(props.delta.change, {
      Added: () => positiveColor,
      Untracked: () => neutralColor,
      Copied: () => neutralColor,
      Deleted: () => negativeColor,
      Renamed: () => neutralColor,
      Modified: () => changeColor,
    });

  const splitFile = () => {
    const path = getFile().path;
    const lastSlash = path.lastIndexOf("/");
    return lastSlash >= 0
      ? [path.slice(0, lastSlash), path.slice(lastSlash)]
      : ["", path];
  };

  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  useTippy(anchor, {
    hidden: true,
    props: {
      content: () => {
        const file = getFile();
        return file.path;
      },
      placement: "left",
    },
  });

  return () => {
    const [path, name] = splitFile();

    return (
      <li class={classes.changeLine} ref={setAnchor}>
        <span class={classes.changeIcon} style={{ color: getStyle() }}>
          <Dynamic component={getIcon()} />
        </span>
        <span
          class={classes.filePathDirectory}
          style={{
            "min-width": Math.min(3, path.length * 0.6) + "rem",
          }}
        >
          {path}
        </span>
        <span class={classes.filePathName}>{name}</span>
        {props.children}
      </li>
    );
  };
};

function switchChangeType<T>(
  value: FileChange,
  options: Record<
    "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
    (content: File[]) => T
  >
): T;
function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue: T
): T;
function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue?: T
): T {
  if ("Added" in value && options.Added) {
    return options.Added([value.Added]);
  }
  if ("Untracked" in value && options.Untracked) {
    return options.Untracked([value.Untracked]);
  }
  if ("Copied" in value && options.Copied) {
    return options.Copied(value.Copied);
  }
  if ("Deleted" in value && options.Deleted) {
    return options.Deleted([value.Deleted]);
  }
  if ("Renamed" in value && options.Renamed) {
    return options.Renamed(value.Renamed);
  }
  if ("Modified" in value && options.Modified) {
    return options.Modified(value.Modified);
  }
  return defaultValue!;
}
