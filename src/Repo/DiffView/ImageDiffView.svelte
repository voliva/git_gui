<script lang="ts">
  import ButtonGroup from "@/components/ButtonGroup.svelte";
  import ImageOverlayDiff from "./ImageOverlayDiff.svelte";
  import {
    changeImageDiffMode,
    deltaPaths$,
    diffViewSettings$,
    setDiffDelta,
  } from "./diffViewState";
  import classNames from "classnames";
  import ImageSideBySide from "./ImageSideBySide.svelte";
  import ImageDiffOpacity from "./ImageDiffOpacity.svelte";

  $: view = $diffViewSettings$?.image_mode;
  $: isSingle = !($deltaPaths$?.new && $deltaPaths$.old);
</script>

<div class="image-diff-view">
  <div class="header">
    {#if !isSingle}
      <ButtonGroup>
        <button
          on:click={() => changeImageDiffMode("SideBySide")}
          class={classNames({
            active: view === "SideBySide",
          })}>Side by side</button
        >
        <button
          on:click={() => changeImageDiffMode("Slide")}
          class={classNames({
            active: view === "Slide",
          })}>Slide</button
        >
        <button
          on:click={() => changeImageDiffMode("Opacity")}
          class={classNames({
            active: view === "Opacity",
          })}>Opacity</button
        >
      </ButtonGroup>
      <button on:click={() => setDiffDelta(null)}>Close</button>
    {/if}
  </div>
  {#if isSingle}
    <div />
  {:else if view === "SideBySide"}
    <ImageSideBySide />
  {:else if view === "Slide"}
    <ImageOverlayDiff />
  {:else if view === "Opacity"}
    <ImageDiffOpacity />
  {/if}
</div>

<style>
  .image-diff-view {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }
  .header {
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
  }
</style>
