import { invoke } from "@tauri-apps/api";

export const RepoHeader = () => {
  return (
    <div>
      Header <button onClick={() => invoke("fetch")}>Fetch</button>
    </div>
  );
};
