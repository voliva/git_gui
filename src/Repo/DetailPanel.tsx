import { FullTab, FullTabs } from "@/components/Tabs/FullTabs";
import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { waitWithLatestFrom } from "@/tauriRx";
import { invoke } from "@tauri-apps/api";
import { of, switchMap } from "rxjs";
import { For, observable, Show } from "solid-js";
import * as classes from "./DetailPanel.css";
import { activeCommit$, setActiveCommit } from "./RepoGrid/activeCommit";
import { CommitInfo, commitLookup$ } from "./repoState";

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

const commit$ = activeCommit$.pipeState(
  waitWithLatestFrom(commitLookup$),
  switchMap(([id, commits]) => {
    if (!(id in commits)) {
      return invoke<CommitInfo>("getCommit", { id }); // TODO
    }
    return of(commits[id].commit);
  })
);

const Details = () => {
  const commit = readState(commit$, null);

  return (
    <Show when={commit()}>
      <div class={qs("boxFill", "verticalFlex")}>
        <CommitDetails commit={commit()!} />
        <ActiveCommitChanges />
      </div>
    </Show>
  );
};

const CommitDetails = (props: { commit: CommitInfo }) => {
  return (
    <div class={qs("boxAuto")}>
      <ul>
        <li>Commit: {props.commit.id.substring(0, 6)}</li>
        <Show when={props.commit.parents.length}>
          <li>
            Parents:
            <For each={props.commit.parents}>
              {(id) => <CommitLink>{id}</CommitLink>}
            </For>
          </li>
        </Show>
        <li>
          Author: {props.commit.author.name} &lt;{props.commit.author.email}&gt;
        </li>
        <li>Date: {new Date(props.commit.time * 1000).toLocaleString()}</li>
      </ul>
      <h3>{props.commit.summary}</h3>
      <p>{props.commit.body}</p>
    </div>
  );
};

const CommitLink = (props: { children: string }) => {
  return (
    <span onClick={() => setActiveCommit(props.children)}>
      {" "}
      {props.children.substring(0, 6)}
    </span>
  );
};

const commitChanges$ = activeCommit$.pipe(
  switchMap((id) => invoke("getCommitChanges", { id }))
);

const ActiveCommitChanges = () => {
  return <div class={qs("boxFill", "overflowAuto")}>Commit Changes</div>;
};

const WorkingDirectory = () => {
  return <div class={qs("boxFill", "verticalFlex")}>Working dir</div>;
};
