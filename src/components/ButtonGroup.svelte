<div class="button-group">
  <slot />
</div>

<style>
  .button-group {
    display: inline-flex;
  }
  .button-group > :global(button:not(:first-child)) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left-width: 0;
  }
  .button-group > :global(button:not(:last-child)) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
</style>
