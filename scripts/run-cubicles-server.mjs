import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const cubiclesRoot = process.env.JUICE_CUBICLES_ROOT;
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "7788");

if (!cubiclesRoot) {
  throw new Error("JUICE_CUBICLES_ROOT is required.");
}

const serverEntry = resolve(cubiclesRoot, "packages/server/dist/index.js");

if (!existsSync(serverEntry)) {
  throw new Error(`Cubicles server build not found at ${serverEntry}.`);
}

const { startServer } = await import(pathToFileURL(serverEntry).href);
const server = startServer({
  host,
  port,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
