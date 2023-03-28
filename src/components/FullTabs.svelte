<script lang="ts">
  import { qs } from "@/quickStyles";
  import classNames from "classnames";
  import { createEventDispatcher } from "svelte";

  let className: string = "";
  export { className as class };
  export let options: Array<{
    id: string;
    disabled?: boolean;
    onActive?: () => void;
    header: string;
  }>;
  const dispatch = createEventDispatcher();

  let selectedOption = options[0];
</script>

<div class={className}>
  <div class={qs("horizontalFlex", "noOverflow", "boxAuto")}>
    {#each options as option}
      <button
        class={classNames("full-tab", qs("textEllipsis", "boxSplit"), {
          active: selectedOption === option,
          disabled: option.disabled,
        })}
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
  .full-tab {
    padding: 0.4rem;
    cursor: pointer;
    user-select: none;
    background: transparent;
    color: white;
    border: none;
    text-align: left;
    background-color: rgba(34, 34, 68, 0.4);
    margin: 0;
  }
  .full-tab.active {
    background-color: #222244;
  }
  .full-tab.disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
