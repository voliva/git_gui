import { DetailPanel } from "./DetailPanel";
import { ObjectsPanel } from "./ObjectsPanel";
import { container, content } from "./Repo.css";
import { RepoGrid } from "./RepoGrid";
import { RepoHeader } from "./RepoHeader";

export function Repo() {
  return (
    <div class={container}>
      <RepoHeader />

      <div class={content}>
        <ObjectsPanel />
        <RepoGrid />
        <DetailPanel />
      </div>
    </div>
  );
}
