import { defineApp } from "convex/server";

// Convex 1.43+ expects an explicit app config. Without this file the CLI
// falls back to an empty app definition and deploys zero functions.
const app = defineApp();
export default app;
