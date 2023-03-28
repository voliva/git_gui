<script lang="ts">
  import { qs } from "@/quickStyles";
  import type { SignatureInfo } from "../repoState";
  import { commitAuthor } from "./detailPanel.css";

  const GRAVATAR_SIZE = 36;
  export let author: SignatureInfo;

  const getGravatarUrl = () => {
    const hash = author.hash ?? "no_one";
    return `https://www.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=identicon`;
  };
</script>

<div class={commitAuthor}>
  <img
    src={getGravatarUrl()}
    width={GRAVATAR_SIZE}
    height={GRAVATAR_SIZE}
    alt="avatar"
  />
  <div class={qs("verticalFlex", "noOverflow")}>
    <div class={qs("textEllipsis")}>{author.name ?? ""}</div>
    <div class={qs("textEllipsis")}>{author.email ?? ""}</div>
  </div>
</div>
