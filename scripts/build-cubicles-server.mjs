import { execFileSync } from "node:child_process";

const cubiclesRoot = process.env.JUICE_CUBICLES_ROOT;

if (!cubiclesRoot) {
  throw new Error("JUICE_CUBICLES_ROOT is required.");
}

execFileSync("npm", ["run", "build"], {
  cwd: cubiclesRoot,
  stdio: "inherit",
  env: process.env,
});
