<script lang="ts">
  import { qs } from "@/quickStyles";
  import tippy from "svelte-tippy";
  import {
    switchChangeType,
    type Delta,
    type File,
    type FileChange,
  } from "./activeCommitChangesState";
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
  import { createEventDispatcher } from "svelte";
  import classNames from "classnames";
  import { selectedDelta$ } from "../DiffView/diffViewState";

  export let delta: Delta;
  const dispatch = createEventDispatcher();

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
</script>

<li
  class={classNames(classes.changeLine, {
    active: $selectedDelta$ === delta,
  })}
  use:tippy={{
    placement: "left",
    content: file.path,
  }}
  on:click={() => dispatch("click")}
  on:keypress={(evt) => evt.code === "Enter" && dispatch("click")}
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
