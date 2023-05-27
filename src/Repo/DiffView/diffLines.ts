import { Side, type Change, type DeltaDiff, type Hunk } from "./diffViewState";

export interface Line {
  number: [number | null, number | null];
  type: "add" | "remove" | "pad" | null;
  content: string | null;
  height?: number;
}

export function getHunkDiffLines(
  deltaDiff: DeltaDiff,
  hunk: Hunk,
  side: Side | null
) {
  const oldLines = deltaDiff.old_file?.split("\n") ?? [];
  const newLines = deltaDiff.new_file?.split("\n") ?? [];
  if (side) {
    return getDiffSideLines(
      oldLines,
      newLines,
      hunk.old_range,
      hunk.new_range,
      hunk.changes,
      side
    );
  } else {
    return getDiffUnifiedLines(
      oldLines,
      newLines,
      hunk.old_range,
      hunk.new_range,
      hunk.changes
    );
  }
}

export function getFileDiffLines(deltaDiff: DeltaDiff, side: Side | null) {
  const changes = deltaDiff.hunks.flatMap((hunk) => hunk.changes);
  const oldLines = deltaDiff.old_file?.split("\n") ?? [];
  const oldRange: [number, number] = oldLines.length
    ? [1, oldLines.length]
    : [0, 0];
  const newLines = deltaDiff.new_file?.split("\n") ?? [];
  const newRange: [number, number] = newLines.length
    ? [1, newLines.length]
    : [0, 0];

  if (side) {
    return getDiffSideLines(
      oldLines,
      newLines,
      oldRange,
      newRange,
      changes,
      side
    );
  } else {
    return getDiffUnifiedLines(oldLines, newLines, oldRange, newRange, changes);
  }
}

function getDiffUnifiedLines(
  oldLines: string[],
  newLines: string[],
  oldRange: [number, number],
  newRange: [number, number],
  changes: Change[]
) {
  let oldNum = oldRange[0];
  const oldEnd = oldNum + oldRange[1];
  let newNum = newRange[0];
  const newEnd = newNum + newRange[1];

  // Helpers to avoid ternaries everywhere
  const getNum = (side: Side) => (side === Side.OldFile ? oldNum : newNum);
  const incrementNum = (side: Side) =>
    side === Side.OldFile ? oldNum++ : newNum++;
  const getLines = (side: Side) =>
    side === Side.OldFile ? oldLines : newLines;
  console.log({ oldLines, newLines });

  const lines: Line[] = [];
  const reversedChanges = [...changes].reverse();
  while (oldNum < oldEnd || newNum < newEnd) {
    const change = reversedChanges.at(-1);
    if (change && getNum(change.side) === change.line_num) {
      // Add only the changed side
      lines.push({
        content: getLines(change.side)[change.line_num - 1],
        number: change.side === Side.NewFile ? [null, newNum] : [oldNum, null],
        type: change.change_type == "+" ? "add" : "remove",
      });
      incrementNum(change.side);
      reversedChanges.pop();
    } else {
      // Line unchanged, just push it.
      lines.push({
        content: newLines[newNum - 1],
        number: [oldNum, newNum],
        type: null,
      });
      newNum++;
      oldNum++;
    }
  }

  return lines;
}

function getDiffSideLines(
  oldLines: string[],
  newLines: string[],
  oldRange: [number, number],
  newRange: [number, number],
  changes: Change[],
  side: Side
) {
  let oldNum = oldRange[0];
  const oldEnd = oldNum + oldRange[1];
  let newNum = newRange[0];
  const newEnd = newNum + newRange[1];

  const getLines = (side: Side) =>
    side === Side.OldFile ? oldLines : newLines;

  const lines: Line[] = [];
  let changeIdx = 0;
  const getLineNum = () => (side === Side.NewFile ? newNum : oldNum);
  const lineEnd = side === Side.NewFile ? newEnd : oldEnd;

  const getContiguousChanges = () => {
    let oldNumTemp = oldNum;
    let newNumTemp = newNum;
    let changeIdxTemp = changeIdx;
    const getNum = (side: Side) =>
      side === Side.OldFile ? oldNumTemp : newNumTemp;
    const oldChanges: Change[] = [];
    const newChanges: Change[] = [];
    let change: Change;
    while (
      (change = changes[changeIdxTemp]) &&
      getNum(change.side) === change.line_num
    ) {
      if (change.side === Side.NewFile) {
        newChanges.push(change);
        newNumTemp++;
      } else {
        oldChanges.push(change);
        oldNumTemp++;
      }
      changeIdxTemp++;
    }
    return [oldChanges, newChanges];
  };

  while (getLineNum() < lineEnd) {
    const [oldChanges, newChanges] = getContiguousChanges();
    const totalChanges = oldChanges.length + newChanges.length;
    if (totalChanges) {
      console.log(oldChanges, newChanges);
      const sideChanges = side === Side.OldFile ? oldChanges : newChanges;
      const padding =
        Math.max(oldChanges.length, newChanges.length) - sideChanges.length;
      sideChanges.forEach((change) => {
        lines.push({
          content: getLines(change.side)[change.line_num - 1],
          number: [change.line_num, change.line_num], // A bit of a hack, we will only show the relevant value
          type: change.change_type == "+" ? "add" : "remove",
        });
      });
      if (padding) {
        lines.push({
          content: null,
          number: [null, null],
          type: "pad",
          height: padding,
        });
      }
      changeIdx += totalChanges;
      oldNum += oldChanges.length;
      newNum += newChanges.length;
    } else {
      // Line unchanged - push and increment both (we need to keep track of the other side)
      lines.push({
        content: newLines[newNum - 1],
        number: [oldNum, newNum],
        type: null,
      });
      newNum++;
      oldNum++;
    }
  }
  return lines;
}
