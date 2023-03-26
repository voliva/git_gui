<script lang="ts">
  import { boxFill } from "@/quickStyles.css";
  import { commits$ } from "../repoState";
  import VirtualScroll from "svelte-virtual-scroll-list";
  import classNames from "classnames";
  import { getInitialWidth } from "./graphColumn";
  import GraphCell from "./GraphCell.svelte";
  import CommitCell from "./CommitCell.svelte";

  let graphColumnWidth = getInitialWidth();
</script>

{#if $commits$}
  <div class={classNames(boxFill, "repoGrid")}>
    <VirtualScroll data={$commits$} key="id" let:data>
      <div class="row">
        <div class="cell" style:width={graphColumnWidth + "px"}>
          <GraphCell item={data} width={graphColumnWidth} />
          <div class="resizer">|</div>
        </div>
        <div class="cell"><CommitCell item={data} /></div>
      </div>
    </VirtualScroll>
  </div>
{:else}
  <div class={boxFill} />
{/if}

<style>
  .repoGrid {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .row,
  .cell {
    display: flex;
  }
</style>
