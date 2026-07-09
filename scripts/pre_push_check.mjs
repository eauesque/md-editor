#!/usr/bin/env node
// Pre-push quality gate.
//
// Runs the fast local checks that would otherwise need CI minutes:
//   1. tsc --noEmit   -- TypeScript type errors
//   2. vitest run     -- unit tests (converters, i18n parity, tabs, search)
//
// Skip individual checks: PRE_PUSH_SKIP=ts,test node scripts/pre_push_check.mjs
// Bypass entirely (discouraged): git push --no-verify
//
// Exit codes:
//   0  all clean
//   1  one or more checks failed
//   2  tool setup problem (missing binary etc.)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const isWindows = platform() === "win32";
const skip = new Set(
  (process.env.PRE_PUSH_SKIP || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function bin(name) {
  const suffix = isWindows ? ".CMD" : "";
  return join(REPO_ROOT, "node_modules", ".bin", `${name}${suffix}`);
}

function checkHooksPath() {
  const result = spawnSync("git", ["config", "--get", "core.hooksPath"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  const value = (result.stdout || "").trim();
  if (value === ".githooks") {
    console.log("[pre-push] core.hooksPath=.githooks (tracked gate active)");
  } else {
    console.warn(
      `[pre-push] WARNING: core.hooksPath is ${value || "(unset)"}, not '.githooks' -- ` +
        "this gate is dormant on other clones/CI unless they run:\n" +
        "  git config core.hooksPath .githooks"
    );
  }
}

function run(label, key, binName, args) {
  if (skip.has(key)) {
    console.log(`[pre-push] SKIP ${label} (PRE_PUSH_SKIP)`);
    return { ok: true };
  }
  const bp = bin(binName);
  if (!existsSync(bp)) {
    console.error(`[pre-push] ${label}: ${binName} not found at ${bp}. Run pnpm install.`);
    return { ok: false, setupError: true };
  }
  console.log(`[pre-push] running ${label}...`);
  const result = spawnSync(bp, args, { cwd: REPO_ROOT, stdio: "inherit", shell: isWindows });
  if (result.status !== 0) {
    console.error(`[pre-push] ${label} FAILED`);
    return { ok: false };
  }
  console.log(`[pre-push] ${label} OK`);
  return { ok: true };
}

checkHooksPath();

const checks = [
  run("TypeScript typecheck", "ts", "tsc", ["--noEmit"]),
  run("Vitest unit tests", "test", "vitest", ["run"]),
];

const setupError = checks.some((c) => c.setupError);
const failed = checks.some((c) => !c.ok);

if (setupError) {
  console.error("\n[pre-push] tool setup problem -- see above.");
  process.exit(2);
}
if (failed) {
  console.error(
    "\n[pre-push] checks failed. Fix the issues or bypass with --no-verify (discouraged)."
  );
  console.error("[pre-push] Skip individual checks: PRE_PUSH_SKIP=ts,test git push");
  process.exit(1);
}
process.exit(0);
