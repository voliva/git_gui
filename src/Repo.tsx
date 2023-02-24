import { repo$ } from "./repoState";
import { readState } from "./rxState";

export function Repo() {
  const repo = readState(repo$);

  return <div>{repo()}</div>;
}
