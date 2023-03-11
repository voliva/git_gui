import { CellRendererProps, Column } from "@/components/Grid";
import { readParametricState } from "@/rxState";
import { state } from "@react-rxjs/core";
import { map } from "rxjs";
import { AiOutlineCloud, AiOutlineTag } from "solid-icons/ai";
import { FaRegularHardDrive, FaSolidHorseHead } from "solid-icons/fa";
import { createSignal, For, ValidComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useTippy } from "solid-tippy";
import "tippy.js/dist/tippy.css";
import { PositionedCommit, refs$, RefType, RemoteRef } from "../repoState";
import { LookedUpRef, RefGroup, refsLookup$ } from "./refsLookup";
import * as gridClasses from "./RepoGrid.css";
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
  return (
    <div class={classes.summaryCell}>
      <CommitRefs id={props.item.commit.id} />
      <div class={classes.commitSummary}>{props.item.commit.summary}</div>
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
const isDetachedHead$ = state(
  (id: string) =>
    refs$.pipe(map((refs) => refs.head === id && refs.activeBranch === null)),
  false
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
      class={classes.refTagIcon}
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

  return <Dynamic class={classes.refTagIcon} component={icons[props.type]} />;
};

const TagGroup = (props: { group: RefGroup }) => {
  return (
    <div class={classes.refTag}>
      <div class={classes.refTagName}>{props.group.name}</div>
      <For each={Object.entries(props.group.refs)}>
        {([type, refs]) => <TagIcon type={type as RefType} refs={refs} />}
      </For>
    </div>
  );
};

const CommitRefs = (props: { id: string }) => {
  const refGroups = readParametricState(commitRefGroups$, () => props.id);
  const isDetachedHead = readParametricState(isDetachedHead$, () => props.id);

  return (
    <div class={classes.commitRefs}>
      {isDetachedHead() ? (
        <div class={classes.refTag}>
          <div class={classes.refTagName}>HEAD</div>
          <FaSolidHorseHead class={classes.refTagIcon} />
        </div>
      ) : null}
      <For each={Object.values(refGroups())}>
        {(refGroup) => <TagGroup group={refGroup} />}
      </For>
    </div>
  );
};
