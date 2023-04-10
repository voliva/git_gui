<script lang="ts">
  import { deltaPaths$ } from "./diffViewState";

  let container: HTMLDivElement;

  const MIN_SCALE = 1;

  let scale = MIN_SCALE;
  let translate = [0, 0];
  let maskSize = 0.01;

  $: matrix = new DOMMatrix()
    .translate(translate[0], translate[1])
    .scale(scale);

  function handleWheel(evt: WheelEvent) {
    evt.preventDefault();

    let x = evt.clientX - container.offsetLeft - container.offsetWidth / 2;
    let y = evt.clientY - container.offsetTop - container.offsetHeight / 2;
    const point = new DOMPoint(x, y);
    const revPoint = point.matrixTransform(matrix.inverse());

    if (evt.deltaY > 0) {
      scale = Math.max(MIN_SCALE, scale / 1.1);
      // const currentScale = matrix.a;
      // const maxChange = 1 / currentScale;
      // const change = Math.max(1 / 1.1, 0);
      // matrix = matrix.scale(change, change, 1, x, y);
    } else {
      scale = Math.min(100, scale * 1.1);
      // matrix = matrix.scale(1.1, 1.1, 1, x, y);
    }

    const newMatrix = new DOMMatrix()
      .translate(translate[0], translate[1])
      .scale(scale);
    const newRevPoint = point.matrixTransform(newMatrix.inverse());

    const originDisplacement = [
      newRevPoint.x - revPoint.x,
      newRevPoint.y - revPoint.y,
    ];

    const topLeftPosition = new DOMPoint(
      -container.offsetWidth / 2,
      -container.offsetHeight / 2
    ).matrixTransform(newMatrix);
    const bottomRightPosition = new DOMPoint(
      container.offsetWidth / 2,
      container.offsetHeight / 2
    ).matrixTransform(newMatrix);

    const overflowAdjustment = [0, 0];
    // TODO this is buggy
    if (
      topLeftPosition.x + originDisplacement[0] >
      -container.offsetWidth / 2
    ) {
      overflowAdjustment[0] =
        -container.offsetWidth / 2 -
        (topLeftPosition.x + originDisplacement[0]);
    } else if (
      bottomRightPosition.x + originDisplacement[0] <
      container.offsetWidth / 2
    ) {
      overflowAdjustment[0] =
        container.offsetWidth / 2 -
        (bottomRightPosition.x + originDisplacement[0]);
    }
    if (
      topLeftPosition.y + originDisplacement[1] >
      -container.offsetHeight / 2
    ) {
      overflowAdjustment[1] =
        -container.offsetHeight / 2 -
        (topLeftPosition.y + originDisplacement[1]);
    } else if (
      bottomRightPosition.y + originDisplacement[1] <
      container.offsetHeight / 2
    ) {
      overflowAdjustment[1] =
        container.offsetHeight / 2 -
        (bottomRightPosition.y + originDisplacement[1]);
    }

    // Adjust position after scale
    translate = [
      translate[0] + scale * (originDisplacement[0] + overflowAdjustment[0]),
      translate[1] + scale * (originDisplacement[1] + overflowAdjustment[1]),
    ];
  }

  function handleMouseDown(evt: MouseEvent) {
    evt.preventDefault();

    function handleMouseMove(evt: MouseEvent) {
      const x = evt.clientX - container.offsetLeft;
      maskSize = Math.max(0, Math.min(1, x / container.offsetWidth));
    }
    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }
</script>

<div class="image-overlay-diff">
  <div
    class="image-area"
    bind:this={container}
    on:mousewheel={handleWheel}
    style={scale > 2 ? `image-rendering: pixelated;` : ""}
  >
    <div class="image" style={`transform: ${matrix.toString()}`}>
      <div class="header">Modified</div>
      <img alt="new" src={$deltaPaths$?.new} />
    </div>
    <div
      class="mask"
      style={`clip-path: polygon(0% 0%, ${maskSize * 100}% 0%, ${
        maskSize * 100
      }% 100%, 0% 100%)`}
    >
      <div class="image" style={`transform: ${matrix.toString()};`}>
        <div class="header">Original</div>
        <img alt="old" src={$deltaPaths$?.old} />
      </div>
    </div>
    <div
      class="mask-resizer"
      style={`left: ${maskSize * 100}%`}
      on:mousedown={handleMouseDown}
    />
  </div>
</div>

<style>
  .image-overlay-diff {
    flex: 1 1 auto;
    user-select: none;
    display: flex;
    padding: 0 1rem;
  }
  .image-area {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
  .image {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(
      45deg,
      #aaa 12.5%,
      #666 12.5%,
      #666 50%,
      #aaa 50%,
      #aaa 62.5%,
      #666 62.5%,
      #666 100%
    );
    background-size: 12px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .image img {
    max-width: 100%;
    max-height: 100%;
  }
  .image .header {
    padding: 0 0.5rem;
    background: rgba(0, 0, 0, 0.8);
  }
  .mask {
    width: 100%;
    height: 100%;
    position: absolute;
  }
  .mask-resizer {
    position: absolute;
    top: 0;
    height: 100%;
    left: 66%;
    transform: translateX(-50%);
    width: 2px;
    background-color: #222244;
    border: 3px solid white;
    border-top: none;
    border-bottom: none;
    cursor: col-resize;
  }
</style>
