import { Grid } from "@/components/Grid";
import { readState } from "@/rxState";
import classNames from "classnames";
import { activeCommit$, commits$, setActiveCommit } from "../repoState";
import { GraphColumn } from "./GraphColumn";
import { ITEM_HEIGHT } from "./itemHeight";
import * as classes from "./RepoGrid.css";
import { SummaryColumn } from "./SummaryColumn";

export function RepoGrid() {
  const commits = readState(commits$, null);
  const activeId = readState(activeCommit$, null);

  return (
    <>
      {commits() ? (
        <Grid
          class={classes.repoGrid}
          items={commits()!}
          // -1: we need a bit of an overlap, otherwise sometimes there's a glitch where the lines look segmented.
          itemSize={{ height: ITEM_HEIGHT - 1 }}
          itemClass={(item) =>
            classNames(classes.repoGridRow, {
              [classes.activeCommitRow]: item.commit.id === activeId(),
            })
          }
          onRowClick={(item) => setActiveCommit(item.commit.id)}
        >
          <GraphColumn commits={commits()} />
          <SummaryColumn />
        </Grid>
      ) : null}
    </>
  );
}
