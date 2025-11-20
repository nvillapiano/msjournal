import { exec } from "child_process";

export function safeGitCommit(message) {
  return new Promise((resolve) => {
    exec("git rev-parse --is-inside-work-tree", (err) => {
      if (err) return resolve(false);

      const cmd = `git add . && git commit -m ${JSON.stringify(message)}`;
      exec(cmd, (commitErr) => {
        if (commitErr) {
          console.warn("Git commit failed:", commitErr.message);
          return resolve(false);
        }
        resolve(true);
      });
    });
  });
}
