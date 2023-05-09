<script lang="ts">
  export let alt: string;
  export let src: string | undefined | null;
  export let scale: number;

  const MAX_SCALE = 100; // TODO match ZoomContainer
  const ZOOM_LEVELS = 5;

  $: currentZoomLevel = Math.floor(
    (ZOOM_LEVELS * Math.log(scale)) / Math.log(MAX_SCALE)
  );

  function getSrc(level: number) {
    if (!src) return undefined;
    const join = src.includes("?") ? "&" : "?";
    return `${src}${join}zoom_level=${level}`;
  }

  // Preload next level
  $: {
    if (src && currentZoomLevel < ZOOM_LEVELS - 1) {
      const image = new Image();
      image.src = getSrc(currentZoomLevel + 1)!;
    }
  }
</script>

<img {alt} src={getSrc(currentZoomLevel)} />

<style>
  img {
    max-width: 100%;
    max-height: 100%;
  }
</style>
