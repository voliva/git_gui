import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { listen$ } from "@/tauriRx";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { map, merge, switchMap } from "rxjs";
import { For } from "solid-js";
import { repo_path$ } from "../repoState";
import { Delta } from "./ActiveCommitChanges";
import { DeltaSummary } from "./DeltaSummaryLine";

interface WorkingDirStatus {
  unstaged_deltas: Delta[];
  staged_deltas: Delta[];
}

const workingDirectory$ = state(
  merge(
    listen$<WorkingDirStatus>("working-directory").pipe(
      map((evt) => evt.payload)
    ),
    repo_path$.pipe(
      switchMap((path) => invoke<WorkingDirStatus>("get_working_dir", { path }))
    )
  )
);

export const WorkingDirectory = () => {
  console.log("render");
  // TODO this gets rendered even though is in another tab!

  const result = readState(workingDirectory$);

  return (
    <div class={qs("boxFill", "verticalFlex")}>
      <StagingList
        title="Unstaged changes"
        deltas={result()?.unstaged_deltas ?? []}
      />
      <StagingList
        title="Staged changes"
        deltas={result()?.staged_deltas ?? []}
        checked
      />
    </div>
  );
};

const StagingList = (props: {
  title: string;
  deltas: Delta[];
  checked?: boolean;
}) => {
  return (
    <div>
      <div class={qs("horizontalFlex")}>
        <div>{props.title}</div>
        <input type="checkbox" checked={props.checked} />
      </div>
      <ul class={qs("overflowVertical")}>
        <For each={props.deltas}>
          {(delta) => (
            <DeltaSummary delta={delta}>
              <input type="checkbox" checked={props.checked} />
            </DeltaSummary>
          )}
        </For>
      </ul>
    </div>
  );
};
