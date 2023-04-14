import * as monaco from "monaco-editor";
import {
  firstHunk,
  hunkHeaderContainer,
  hunkHeaderContent,
} from "./diffView.css";
import { qs } from "@/quickStyles";
import { firstValueFrom } from "rxjs";
import { selectedDelta$, type Hunk } from "./diffViewState";
import { invoke } from "@tauri-apps/api";
import { repoPath$ } from "../repoState";

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
//

export function viewZoneSetter(
  hunks: Array<{
    header: string;
    range: [number, number];
    original: Hunk;
  }>
) {
  const addedZones: Array<string> = [];
  const setter = (accessor: monaco.editor.IViewZoneChangeAccessor) => {
    hunks.forEach((hunk, i) => {
      const headerText = getHeader(hunk.header);
      if (!headerText && i === 0) {
        return;
      }

      const headerContainer = document.createElement("div");
      headerContainer.classList.add(hunkHeaderContainer);
      if (i === 0) {
        headerContainer.classList.add(firstHunk);
      }

      const headerContent = document.createElement("div");
      headerContent.classList.add(qs("textEllipsis"), hunkHeaderContent);
      headerContainer.appendChild(headerContent);
      if (headerText) {
        headerContent.textContent = "@ " + headerText;
      }

      const stage = document.createElement("button");
      stage.textContent = "Stage";
      stage.onclick = async () => {
        const delta = await firstValueFrom(selectedDelta$);
        const path = await firstValueFrom(repoPath$);
        invoke("stage_hunk", {
          path,
          delta,
          hunk: hunk.original,
        });
      };
      headerContainer.appendChild(stage);

      const zone: monaco.editor.IViewZone = {
        afterLineNumber: i === 0 ? 0 : hunk.range[0] - 1,
        heightInLines: 3,
        domNode: headerContainer,
        afterColumn: Number.MAX_SAFE_INTEGER,
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

const getHeader = (raw: string) => {
  const split = raw.split("@@");
  if (split.length > 2) {
    return split[2].trim();
  }
  return "";
};
