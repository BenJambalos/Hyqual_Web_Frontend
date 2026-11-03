import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const frontendDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendDirectory, "../..");
const backendEntry = path.join(projectRoot, "backend", "index.js");
const viteEntry = path.join(frontendDirectory, "../node_modules/vite/bin/vite.js");
const children = [
  spawn(process.execPath, [backendEntry], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  }),
  spawn(process.execPath, [viteEntry, ...process.argv.slice(2)], {
    cwd: path.dirname(frontendDirectory),
    env: process.env,
    stdio: "inherit",
  }),
];

let stopping = false;

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start a development server:", error);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
