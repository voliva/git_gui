/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { For, Show } from "solid-js";
import * as classes from "./ActiveCommitChanges.css";
import { commitChanges$, CommitContents } from "./activeCommitChangesState";
import { DeltaSummary } from "./DeltaSummaryLine";

export const ActiveCommitChanges = () => {
  const changes = readState(commitChanges$, null);

  return (
    <Show when={changes()}>
      <div class={classes.commitChangeContainer}>
        <ChangeCount changes={changes()!} />
        <div class={qs("boxFill", "overflowVertical")}>
          <ul>
            <For each={changes()?.deltas}>
              {(delta) => <DeltaSummary delta={delta} />}
            </For>
          </ul>
        </div>
      </div>
    </Show>
  );
};

const ChangeCount = (props: { changes: CommitContents }) => {
  const getWidth = (value: number) => {
    const maxAmount = Math.max(
      100,
      props.changes.deletions,
      props.changes.insertions
    );
    return Math.round((1000 * value) / maxAmount) / 10 + "%";
  };

  return (
    <div class={qs("boxAuto", "horizontalFlex")}>
      <div class={qs("boxFill")}>Files: {props.changes.deltas.length}</div>
      <div class={qs("horizontalFlex", "centeredFlex")}>
        <span class={classes.deletions}>{props.changes.deletions}</span>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.deletion}
            style={{
              width: getWidth(props.changes.deletions),
            }}
          />
        </div>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.insertion}
            style={{
              width: getWidth(props.changes.insertions),
            }}
          />
        </div>
        <span class={classes.insertions}>{props.changes.insertions}</span>
      </div>
    </div>
  );
};
