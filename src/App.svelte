<script lang="ts">
  import { invoke } from "@tauri-apps/api";
  import Repo from "./Repo/Repo.svelte";
  import { openRepo, repoPath$ } from "./Repo/repoState";
  import { firstValueFrom } from "rxjs";
  import { selectedDelta$ } from "./Repo/DiffView/diffViewState";

  (window as any).stage_line = async (change: any) =>
    invoke("stage_line", {
      path: await firstValueFrom(repoPath$),
      delta: await firstValueFrom(selectedDelta$),
      change,
    });
</script>

{#if $repoPath$}
  <Repo />
{:else}
  <button type="button" on:click={openRepo}>Open</button>
{/if}
