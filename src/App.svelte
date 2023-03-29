<script lang="ts">
  import Repo from "./Repo/Repo.svelte";
  import { openRepo, repoPath$ } from "./Repo/repoState";
</script>

{#if $repoPath$}
  <Repo />
{:else}
  <button type="button" on:click={openRepo}>Open</button>
{/if}
