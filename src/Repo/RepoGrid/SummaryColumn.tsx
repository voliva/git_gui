import { CellRendererProps, Column } from "@/components/Grid";
import { qs } from "@/quickStyles";
import { readParametricState } from "@/rxState";
import { state } from "@react-rxjs/core";
import classNames from "classnames";
import { firstValueFrom, map } from "rxjs";
import { AiOutlineCloud, AiOutlineTag } from "solid-icons/ai";
import { FaRegularHardDrive, FaSolidHorseHead } from "solid-icons/fa";
import { createSignal, For, ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useTippy } from "solid-tippy";
import { workingDirectory$ } from "../DetailPanel/workingDirectoryState";
import { PositionedCommit, RefType, RemoteRef } from "../repoState";
import { isRelatedToActive$ } from "./activeCommit";
import { LookedUpRef, RefGroup, refsLookup$ } from "./refsLookup";
import * as gridClasses from "./RepoGrid.css";
import { message } from "@tauri-apps/api/dialog";
import * as classes from "./SummaryColumn.css";

export const SummaryColumn = () => (
  <Column
    header="Commit"
    headerClass={classes.summaryHeader}
    itemClass={gridClasses.highlightOnHover}
  >
    {SummaryCell}
  </Column>
);

const SummaryCell = (props: CellRendererProps<PositionedCommit>) => {
  const isRelated = readParametricState(
    isRelatedToActive$,
    () => props.item.commit.id,
    false
  );

  return (
    <div
      class={classNames(classes.summaryCell, {
        [classes.unrelatedCell]: !isRelated(),
      })}
    >
      <CommitRefs id={props.item.commit.id} />
      <div class={qs("boxFill", "textEllipsis")}>
        {props.item.commit.summary}
      </div>
    </div>
  );
};

const icons: Record<RefType, ValidComponent> = {
  [RefType.Head]: FaSolidHorseHead,
  [RefType.LocalBranch]: FaRegularHardDrive,
  [RefType.RemoteBranch]: AiOutlineCloud,
  [RefType.Tag]: AiOutlineTag,
};

const commitRefGroups$ = state(
  (id: string) => refsLookup$.pipe(map((refs) => refs[id] || {})),
  {}
);

const RemoteTagIcon = (props: { refs: RemoteRef[] }) => {
  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  useTippy(anchor, {
    hidden: true,
    props: {
      content: props.refs.map((ref) => ref.remote).join(", "),
    },
  });

  return (
    <Dynamic
      ref={setAnchor}
      class={qs("boxAuto")}
      component={icons[RefType.RemoteBranch]}
    />
  );
};

const TagIcon = (props: { type: RefType; refs: LookedUpRef[] }) => {
  if (props.type === RefType.RemoteBranch) {
    return (
      <RemoteTagIcon refs={props.refs.map((ref) => ref.ref as RemoteRef)} />
    );
  }

  return <Dynamic class={qs("boxAuto")} component={icons[props.type]} />;
};

const TagGroup = (props: { group: RefGroup }) => {
  const onDoubleClick = async () => {
    const isHead = Boolean(props.group.refs[RefType.Head]);
    if (isHead) return;

    const workingDir = await firstValueFrom(workingDirectory$);
    if (workingDir.staged_deltas.length || workingDir.unstaged_deltas.length) {
      await message(
        "You have uncommited changes. Commit, stash or discard them."
      );
      return;
    }

    const localBranch = props.group.refs[RefType.LocalBranch]?.[0];
    if (localBranch) {
      console.log("checkout local branch", localBranch);
      return;
    }

    const remoteBranches = props.group.refs[RefType.RemoteBranch] ?? [];
    if (remoteBranches) {
      console.log("checkout remote branch", remoteBranches);
      return;
    }

    // It has to be a tag. Checkout commit.
    console.log("checkout commit");
  };

  return (
    <div class={classes.refTag} onDblClick={onDoubleClick}>
      <For each={Object.entries(props.group.refs)}>
        {([type, refs]) => <TagIcon type={type as RefType} refs={refs} />}
      </For>
      <div class={qs("boxFill", "textEllipsis")}>{props.group.name}</div>
    </div>
  );
};

const CommitRefs = (props: { id: string }) => {
  const refGroups = readParametricState(commitRefGroups$, () => props.id);

  return (
    <div class={classes.commitRefs}>
      <For each={Object.values(refGroups())}>
        {(refGroup) => <TagGroup group={refGroup} />}
      </For>
    </div>
  );
};
