import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { writeText } from "@tauri-apps/api/clipboard";
import { AiOutlineCopy } from "solid-icons/ai";
import { createSignal, For, Show } from "solid-js";
import { useTippy } from "solid-tippy";
import { CommitInfo, commitLookup$, SignatureInfo } from "../repoState";
import * as classes from "./CommitDetails.css";
import { setActiveCommit } from "../RepoGrid/activeCommit";
import { buttonLink } from "@/style.css";

export const CommitDetails = (props: { commit: CommitInfo }) => {
  const [anchor, setAnchor] = createSignal<HTMLDivElement>();
  const [copied, setCopied] = createSignal(false);

  useTippy(anchor, {
    hidden: true,
    props: {
      content: (<div>{copied() ? "Copied" : "Copy full hash"}</div>) as Element,
      hideOnClick: false,
      onHidden: () => setCopied(false),
    },
  });

  return (
    <div class={classes.commitDetails}>
      <div class={classes.commitText}>
        <h4>{props.commit.summary}</h4>
        <p>{props.commit.body}</p>
      </div>
      <div class={qs("horizontalFlex")}>
        <div class={qs("boxFill")}>
          {props.commit.id.substring(0, 7)}
          <button
            class={buttonLink}
            ref={setAnchor}
            onClick={async (evt) => {
              evt.preventDefault();
              await writeText(props.commit.id);
              setCopied(true);
            }}
          >
            <AiOutlineCopy />
          </button>
        </div>
        <div class={qs("boxAuto")}>
          {new Date(props.commit.time * 1000).toLocaleString()}
        </div>
      </div>
      <CommitAuthor author={props.commit.author} />
      <Show when={props.commit.parents.length}>
        <div>
          Parents:
          <For each={props.commit.parents}>
            {(id) => <CommitLink>{id}</CommitLink>}
          </For>
        </div>
      </Show>
    </div>
  );
};

const GRAVATAR_SIZE = 36;
const CommitAuthor = (props: { author: SignatureInfo }) => {
  const getGravatarUrl = () => {
    const hash = props.author.hash ?? "no_one";
    return `https://www.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=identicon`;
  };

  return (
    <div class={classes.commitAuthor}>
      <img
        src={getGravatarUrl()}
        width={GRAVATAR_SIZE}
        height={GRAVATAR_SIZE}
        alt="avatar"
      />
      <div class={qs("verticalFlex", "noOverflow")}>
        <div class={qs("textEllipsis")}>{props.author.name}</div>
        <div class={qs("textEllipsis")}>{props.author.email}</div>
      </div>
    </div>
  );
};

const CommitLink = (props: { children: string }) => {
  const commitLookup = readState(commitLookup$, {});

  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  useTippy(anchor, {
    hidden: true,
    props: {
      content: (
        <div>
          {commitLookup()[props.children]?.commit.summary?.substring(0, 40) ??
            ""}
        </div>
      ) as Element,
    },
  });

  return (
    <button
      class={buttonLink}
      ref={setAnchor}
      onClick={(evt) => {
        evt.preventDefault();
        setActiveCommit(props.children);
      }}
    >
      {" "}
      {props.children.substring(0, 7)}
    </button>
  );
};
