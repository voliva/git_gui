/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FullTab, FullTabs } from "@/components/Tabs/FullTabs";
import { qs } from "@/quickStyles";
import { isNotNullish, readState } from "@/rxState";
import { state } from "@react-rxjs/core";
import { combineLatest, distinctUntilChanged, filter, map } from "rxjs";
import { Show } from "solid-js";
import * as classes from "./DetailPanel.css";
import { ActiveCommitChanges } from "./ActiveCommitChanges";
import { CommitDetails } from "./CommitDetails";
import { WorkingDirectory } from "./WorkingDirectory";
import { activeCommit$ } from "../RepoGrid/activeCommit";
import { commitLookup$ } from "../repoState";

// TODO select Details automatically when selecting an active commit (either by click or programatically (e.g. after commit))
export const DetailPanel = () => {
  return (
    <FullTabs class={classes.detailPanelContainer}>
      <FullTab header="Details">
        <Details />
      </FullTab>
      <FullTab header="Working Directory">
        <WorkingDirectory />
      </FullTab>
    </FullTabs>
  );
};

const commit$ = state(
  combineLatest([activeCommit$.pipe(filter(isNotNullish)), commitLookup$]).pipe(
    filter(([id, commits]) => id in commits),
    map(([id, commits]) => commits[id].commit),
    distinctUntilChanged()
  )
);

const Details = () => {
  const commit = readState(commit$, null);

  return (
    <Show when={commit()}>
      <div class={qs("boxFill", "verticalFlex", "noOverflow")}>
        <CommitDetails commit={commit()!} />
        <ActiveCommitChanges />
      </div>
    </Show>
  );
};
