import { spawnSync } from "node:child_process";

const failedRecoveryMigration = "20260911000200_pipeline_job_idempotency";

function run(args) {
  return spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    encoding: "utf8",
  });
}

const first = run(["migrate", "deploy"]);
if (first.status === 0) process.exit(0);

const combined = `${first.stdout ?? ""}\n${first.stderr ?? ""}`;
const isKnownFailedMigration =
  combined.includes("P3009") && combined.includes(failedRecoveryMigration);

if (!isKnownFailedMigration) {
  process.exit(first.status ?? 1);
}

console.warn(
  `Recovering the known failed Prisma migration ${failedRecoveryMigration} before retrying deployment...`,
);

const resolve = run([
  "migrate",
  "resolve",
  "--rolled-back",
  failedRecoveryMigration,
]);
if (resolve.status !== 0) process.exit(resolve.status ?? 1);

const retry = run(["migrate", "deploy"]);
process.exit(retry.status ?? 1);
