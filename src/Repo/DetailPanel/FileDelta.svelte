<script lang="ts">
  import { qs } from "@/quickStyles";
  import tippy from "svelte-tippy";
  import type { Delta, File, FileChange } from "./activeCommitChangesState";
  import {
    changeColor,
    negativeColor,
    neutralColor,
    positiveColor,
  } from "./commitChanges.css";
  import * as classes from "./fileDelta.css";
  import BsFileEarmarkPlus from "svelte-icons-pack/bs/BsFileEarmarkPlus";
  import BsFileEarmarkMinus from "svelte-icons-pack/bs/BsFileEarmarkMinus";
  import BsFileEarmarkDiff from "svelte-icons-pack/bs/BsFileEarmarkDiff";
  import AiOutlineFileUnknown from "svelte-icons-pack/ai/AiOutlineFileUnknown";
  import VscGoToFile from "svelte-icons-pack/vsc/VscGoToFile";
  import RiDocumentFileTransferLine from "svelte-icons-pack/ri/RiDocumentFileTransferLine";
  import Icon from "svelte-icons-pack";

  export let delta: Delta;

  $: file = switchChangeType(delta.change, {
    Added: ([v]) => v,
    Untracked: ([v]) => v,
    Copied: ([, v]) => v,
    Deleted: ([v]) => v,
    Renamed: ([, v]) => v,
    Modified: ([, v]) => v,
  });
  $: style = switchChangeType(delta.change, {
    Added: () => positiveColor,
    Untracked: () => neutralColor,
    Copied: () => neutralColor,
    Deleted: () => negativeColor,
    Renamed: () => neutralColor,
    Modified: () => changeColor,
  });
  $: icon = switchChangeType(delta.change, {
    Added: () => BsFileEarmarkPlus,
    Untracked: () => AiOutlineFileUnknown,
    Copied: () => RiDocumentFileTransferLine,
    Deleted: () => BsFileEarmarkMinus,
    Renamed: () => VscGoToFile,
    Modified: () => BsFileEarmarkDiff,
  });

  let splitFile: { path: string; name: string };
  $: {
    const path = file.path;
    const lastSlash = path.lastIndexOf("/");
    splitFile =
      lastSlash >= 0
        ? { path: path.slice(0, lastSlash), name: path.slice(lastSlash) }
        : { path: "", name: path };
  }

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return defaultValue!;
  }
</script>

<li
  class={classes.changeLine}
  use:tippy={{
    placement: "left",
    content: file.path,
  }}
>
  <div class={qs("horizontalFlex", "noOverflow", "centeredFlex")}>
    <span class={classes.changeIcon} style="color: {style}">
      <Icon src={icon} />
    </span>
    <span
      class={classes.filePathDirectory}
      style="min-width: {Math.min(3, splitFile.path.length * 0.6)}rem"
    >
      {splitFile.path}
    </span>
    <span class={classes.filePathName}>{splitFile.name}</span>
  </div>
  <slot />
</li>
