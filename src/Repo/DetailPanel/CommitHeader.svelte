<script lang="ts">
  import { qs } from "@/quickStyles";
  import { buttonLink } from "@/style.css";
  import { writeText } from "@tauri-apps/api/clipboard";
  import AiOutlineCopy from "svelte-icons-pack/ai/AiOutlineCopy";
  import Icon from "svelte-icons-pack/Icon.svelte";
  import { tippy } from "svelte-tippy";
  import type { CommitInfo } from "../repoState";
  import { commitText } from "./detailPanel.css";

  export let commit: CommitInfo;
  let copied = false;
</script>

<div>
  <div class={commitText}>
    <h4>{commit.summary ?? ""}</h4>
    <p>{commit.body ?? ""}</p>
  </div>
  <div class={qs("horizontalFlex")}>
    <div class={qs("boxFill")}>
      {commit.id.substring(0, 7)}
      <button
        class={buttonLink}
        on:click={async (evt) => {
          evt.preventDefault();
          await writeText(commit.id);
          copied = true;
        }}
        use:tippy={{
          content: copied ? "Copied" : "Copy full hash",
          hideOnClick: false,
          onHidden() {
            copied = false;
          },
        }}
      >
        <Icon src={AiOutlineCopy} />
      </button>
    </div>
    <div class={qs("boxAuto")}>
      {new Date(commit.time * 1000).toLocaleString()}
    </div>
  </div>
</div>
