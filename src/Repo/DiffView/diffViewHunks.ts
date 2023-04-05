import * as monaco from "monaco-editor";

export function getHiddenRanges(
  hunkRanges: Array<[number, number]>,
  totalLines: number
): Array<monaco.Range> {
  const res: Array<monaco.Range> = [];

  let previousLine = 1;
  hunkRanges.forEach((range) => {
    if (previousLine < range[0]) {
      res.push(new monaco.Range(previousLine, 1, range[0] - 1, 1));
    }
    previousLine = range[0] + range[1];
  });

  if (previousLine < totalLines) {
    res.push(new monaco.Range(previousLine, 1, totalLines, 1));
  }

  return res;
}

export function viewZoneSetter(
  hunks: Array<{
    header: string;
    range: [number, number];
  }>
) {
  const addedZones: Array<string> = [];
  const setter = (accessor: monaco.editor.IViewZoneChangeAccessor) => {
    hunks.forEach((hunk, i) => {
      const div = document.createElement("div");
      div.innerHTML = hunk.header;
      const zone: monaco.editor.IViewZone = {
        afterLineNumber: i === 0 ? 0 : hunks[i].range[0] - 1,
        heightInLines: 2,
        domNode: div,
        afterColumn: 1e4,
      };
      addedZones.push(accessor.addZone(zone));
    });
  };
  const cleanup = (accessor: monaco.editor.IViewZoneChangeAccessor) => {
    addedZones.forEach((id) => accessor.removeZone(id));
    addedZones.length = 0;
  };

  return [setter, cleanup];
}

export function setHiddenAreas(
  editor: monaco.editor.IStandaloneCodeEditor,
  areas: monaco.Range[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editor as any).setHiddenAreas(areas);
}
