<script lang="ts">
  import { qs } from "@/quickStyles";
  import classNames from "classnames";
  import { createEventDispatcher } from "svelte";

  let className = "";
  export { className as class };
  export let equalTabs = true;
  export let padHeader = false;
  export let options: Array<{
    id: string;
    disabled?: boolean;
    highlight?: boolean;
    onActive?: () => void;
    header: string;
  }>;
  const dispatch = createEventDispatcher();

  let selectedOption = options[0];
  $: {
    if (!options.includes(selectedOption)) {
      selectOption(selectedOption.id);
    }
  }

  export function selectOption(id: string) {
    selectedOption = options.find((option) => option.id === id) ?? options[0];
  }
</script>

<div class={className}>
  <div
    class={classNames(
      "tab-header",
      qs("horizontalFlex", "noOverflow", "boxAuto", "flexGap"),
      {
        padHeader,
      }
    )}
  >
    {#each options as option}
      <button
        class={classNames(
          "full-tab",
          qs("textEllipsis", equalTabs ? "boxSplit" : "boxFill"),
          {
            active: selectedOption === option,
            disabled: option.disabled,
            highlight: option.highlight,
          }
        )}
        on:mousedown={(evt) => {
          // disable getting focus if it's disabled
          option.disabled && evt.preventDefault();
        }}
        on:click={() => {
          if (option.disabled) return;
          option.onActive?.();
          dispatch("tabchange", option);
          selectedOption = option;
        }}>{option.header}</button
      >
    {/each}
  </div>
  <slot id={selectedOption.id} />
</div>

<style>
  .tab-header {
    margin-bottom: 2px;
    padding-top: 2px;
  }
  .tab-header.padHeader {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .full-tab {
    padding: 0.5rem;
    cursor: pointer;
    user-select: none;
    background: transparent;
    color: white;
    border: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: 3px solid #444488;
    text-align: left;
    margin: 0;
  }
  .full-tab.highlight {
    box-shadow: 0px -1px 5px 0 rgba(125, 255, 125, 0.4),
      inset 0px 1px 5px -3px rgba(125, 255, 125, 0.4);
  }
  .full-tab.active {
    background-color: #222244;
  }
  .full-tab.highlight.active {
    box-shadow: 0px -1px 5px -1px rgba(125, 255, 125, 0.4);
  }
  .full-tab.disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
