import { readState } from "@/rxState";
import { createEffect } from "solid-js";
import { DetailPanel } from "./DetailPanel";
import { ObjectsPanel } from "./ObjectsPanel";
import { container, content } from "./Repo.css";
import { RepoGrid } from "./RepoGrid";
import { RepoHeader } from "./RepoHeader";
import { refs$ } from "./repoState";

export function Repo() {
  const refs = readState(refs$);

  createEffect(() => {
    console.log(refs());
  });

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
