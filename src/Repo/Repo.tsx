import { DetailPanel } from "./DetailPanel";
import { ObjectsPanel } from "./ObjectsPanel";
import { RepoGrid } from "./RepoGrid";
import { RepoHeader } from "./RepoHeader";
import classes from "./Repo.module.css";

export function Repo() {
  return (
    <div class={classes.repoContainer}>
      <RepoHeader />

      <div class={classes.repoContent}>
        <ObjectsPanel />
        <RepoGrid />
        <DetailPanel />
      </div>
    </div>
  );
}
