import { qs } from "@/quickStyles";
import { DetailPanel } from "./DetailPanel";
import { ObjectsPanel } from "./ObjectsPanel";
import { RepoGrid } from "./RepoGrid";
import { RepoHeader } from "./RepoHeader";

export function Repo() {
  return (
    <div class={qs("verticalFlex", "noOverflow")}>
      <RepoHeader />

      <div class={qs("boxFill", "horizontalFlex", "noOverflow")}>
        <ObjectsPanel />
        <RepoGrid />
        <DetailPanel />
      </div>
    </div>
  );
}
