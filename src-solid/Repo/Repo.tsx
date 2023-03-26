import { qs } from "@/quickStyles";
import { DetailPanel } from "./DetailPanel";
import { RepoGrid } from "./RepoGrid";
import { RepoHeader } from "./RepoHeader";

export function Repo() {
  return (
    <div class={qs("verticalFlex", "noOverflow")}>
      <RepoHeader />

      <div class={qs("boxFill", "horizontalFlex", "noOverflow")}>
        <RepoGrid />
        <DetailPanel />
      </div>
    </div>
  );
}
