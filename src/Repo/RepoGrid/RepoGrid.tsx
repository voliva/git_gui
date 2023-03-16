import { Grid } from "@/components/Grid";
import { boxFill } from "@/quickStyles.css";
import { readState } from "@/rxState";
import classNames from "classnames";
import { Show } from "solid-js";
import { commits$ } from "../repoState";
import { activeCommit$, setActiveCommit } from "./activeCommit";
import { GraphColumn } from "./GraphColumn";
import { ITEM_HEIGHT } from "./itemHeight";
import * as classes from "./RepoGrid.css";
import { SummaryColumn } from "./SummaryColumn";

export function RepoGrid() {
  const commits = readState(commits$, null);
  const activeId = readState(activeCommit$, null);

  const selectNextCommit = (evt: KeyboardEvent) => {
    let dir = 0;
    if (evt.code === "ArrowUp") {
      dir = -1;
    } else if (evt.code === "ArrowDown") {
      dir = 1;
    } else {
      return;
    }

    const id = activeId();
    const commitList = commits();
    const currentIdx =
      commitList?.findIndex((commit) => commit.commit.id === id) ?? -1;
    if (currentIdx >= 0) {
      const nextId = commitList![currentIdx + dir].commit.id;
      if (nextId) {
        setActiveCommit(nextId);
      }
    }
  };

  return (
    <Show when={commits()} fallback={<div class={boxFill} />}>
      <Grid
        class={boxFill}
        items={commits()!}
        // -1: we need a bit of an overlap, otherwise sometimes there's a glitch where the lines look segmented.
        itemSize={{ height: ITEM_HEIGHT - 1 }}
        itemClass={(item) =>
          classNames(classes.repoGridRow, {
            [classes.activeCommitRow]: item.commit.id === activeId(),
          })
        }
        onRowClick={(item) => setActiveCommit(item.commit.id)}
        onKeyDown={selectNextCommit}
      >
        <GraphColumn commits={commits()} />
        <SummaryColumn />
      </Grid>
    </Show>
  );
}
