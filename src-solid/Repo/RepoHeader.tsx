import { readState } from "@/rxState";
import { fetch, isFetching$ } from "./repoState";

export const RepoHeader = () => {
  const isFetching = readState(isFetching$);

  return (
    <div>
      <button disabled={isFetching()} onClick={fetch}>
        Fetch
      </button>
    </div>
  );
};
