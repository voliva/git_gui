<script lang="ts">
  import { firstValueFrom } from "rxjs";
  import {
    type Hunk,
    selectedDeltaKind$,
    selectedDelta$,
  } from "./diffViewState";
  import { repoPath$ } from "../repoState";
  import { invoke } from "@tauri-apps/api";

  export let hunk: Hunk;

  function getHeader(raw: string) {
    const split = raw.split("@@");
    const context = split[2]?.trim() ?? "";
    if (context) {
      return "@ " + context;
    }
    return "";
  }
  async function stage() {
    const delta = await firstValueFrom(selectedDelta$);
    const path = await firstValueFrom(repoPath$);
    invoke("stage_hunk", {
      path,
      delta,
      hunk,
    });
  }
  async function unstage() {
    const delta = await firstValueFrom(selectedDelta$);
    const path = await firstValueFrom(repoPath$);
    invoke("unstage_hunk", {
      path,
      delta,
      hunk,
    });
  }
</script>

<div class="hunk">
  <div class="header-container">
    <div class="header-context">{getHeader(hunk.header)}</div>
    {#if $selectedDeltaKind$ === "staged"}
      <button on:click={unstage}>Unstage</button>
    {/if}
    {#if $selectedDeltaKind$ === "unstaged"}
      <button on:click={stage}>Stage</button>
    {/if}
  </div>
  <slot />
</div>

<style>
  .header-container {
    display: flex;
    align-items: flex-end;
    color: #444;
    border-bottom: thin solid;
    border-top: thin solid;
    height: 4rem;
    padding: 0.2rem;
  }

  .header-context {
    color: #aaa;
    flex: 1 1 auto;
  }
</style>
