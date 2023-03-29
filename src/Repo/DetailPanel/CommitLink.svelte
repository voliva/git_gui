<script lang="ts">
  import { buttonLink } from "@/style.css";
  import { tippy } from "svelte-tippy";
  import { setActiveCommit } from "../RepoGrid/activeCommit";
  import { commitLookup$ } from "../repoState";

  export let id: string;
</script>

<button
  class={buttonLink}
  use:tippy={{
    content: $commitLookup$[id]?.commit.summary?.substring(0, 40) ?? "",
  }}
  on:click={(evt) => {
    evt.preventDefault();
    setActiveCommit(id);
  }}
>
  {id.substring(0, 7)}
</button>
