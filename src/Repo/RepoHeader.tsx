import { invoke } from "@tauri-apps/api";
import { firstValueFrom } from "rxjs";
import { repo_path$ } from "./repoState";

export const RepoHeader = () => {
  return (
    <div>
      Header{" "}
      <button
        onClick={async () => {
          const path = await firstValueFrom(repo_path$);
          try {
            console.log("fetching...");
            const result = await invoke("fetch", { path });
            console.log("finished!", result);
          } catch (ex) {
            console.error(ex);
          }
        }}
      >
        Fetch
      </button>
    </div>
  );
};
