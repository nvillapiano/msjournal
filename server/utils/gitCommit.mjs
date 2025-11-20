import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// repo root is two levels up from server/utils
const repoRoot = path.join(__dirname, "..", "..");

export function safeGitCommit(message) {
  return new Promise((resolve) => {
    // First check we're inside a git work tree, using the repoRoot as cwd for determinism
    exec("git rev-parse --is-inside-work-tree", { cwd: repoRoot }, (err, stdout, stderr) => {
      if (err) {
        console.warn("Git check failed (not a repo or git missing). cwd:", repoRoot, "->", (stderr || err.message));
        return resolve(false);
      }
      // Check whether there are any changes in the journal folder to commit.
      exec("git status --porcelain=1 journal", { cwd: repoRoot }, (statusErr, statusStdout) => {
        if (statusErr) {
          console.warn("Git status check failed. cwd:", repoRoot, "->", (statusErr.message || statusStdout));
          // Proceed with attempting to add & commit — best-effort
        }

        if (!statusStdout || !statusStdout.toString().trim()) {
          // Nothing to commit in journal — don't attempt to commit.
          console.info("No changes in 'journal' to commit.");
          return resolve(false);
        }

        // Only add the journal folder to avoid staging unrelated changes
        const addCmd = `git add journal`;
        const commitCmd = `git commit -m ${JSON.stringify(message)}`;
        const cmd = `${addCmd} && ${commitCmd}`;

        exec(cmd, { cwd: repoRoot }, (commitErr, commitStdout, commitStderr) => {
          if (commitErr) {
            // Provide diagnostic info to help debug commit failures
            console.warn("Git commit failed. cwd:", repoRoot, "stderr:", (commitStderr || commitErr.message));
            return resolve(false);
          }

          // Log a brief success message for diagnostics
          try {
            const firstLine = (commitStdout || "").toString().split("\n")[0] || "(no output)";
            console.info("Git commit succeeded:", firstLine);
          } catch (e) {
            // ignore logging errors
          }

          resolve(true);
        });
      });
    });
  });
}
