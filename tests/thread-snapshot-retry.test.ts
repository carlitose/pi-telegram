import assert from "node:assert/strict";
import fs from "node:fs";
import fsPromises, { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createTelegramTopicTargetStore } from "../lib/threads.ts";

// Exercise the real store commit, not just the shared rename helper. Both Node
// rename entry points are injected so the old async and fenced paths fail RED.
for (const mode of ["plain", "fenced", "invalidate"] as const) {
  for (const scenario of [
    { code: "EPERM", failures: 2, succeeds: true },
    { code: "EBUSY", failures: 2, succeeds: true },
    { code: "EACCES", failures: 2, succeeds: true },
    { code: "EPERM", failures: Infinity, succeeds: false },
    { code: "EIO", failures: Infinity, succeeds: false },
    { code: "ENOENT", failures: Infinity, succeeds: false },
  ]) {
    test(`Thread snapshot ${mode}: ${scenario.code} ${scenario.succeeds ? "recovers" : "rejects"}`, async (t) => {
      const root = await mkdtemp(join(tmpdir(), "telegram-snapshot-retry-"));
      const path = join(root, "state.json");
      const target = { chatId: 7, threadId: 42 };
      const record = {
        profileKey: "manual:old", instanceId: "old", target,
        status: "active" as const, slot: "A", createdAtMs: 1, updatedAtMs: 1,
      };
      const store = createTelegramTopicTargetStore({
        path,
        ...(mode === "fenced" ? { commitPersist(commit: () => void) { commit(); return true; } } : {}),
      });
      try {
        store.upsert(record);
        await store.persist();
        const before = await readFile(path, "utf8");
        const actualRenameSync = fs.renameSync;
        const actualRename = fsPromises.rename;
        const injected = Object.assign(new Error("injected snapshot rename failure"), { code: scenario.code });
        let attempts = 0;
        let readerClosed = false;
        const inject = (destination: unknown) => {
          if (String(destination) !== path) return;
          attempts += 1;
          if (attempts === 1) setImmediate(() => { readerClosed = true; });
          if (mode === "plain" && attempts > 1) {
            assert.ok(readerClosed, "unfenced retries must let pending readers close");
          }
          if (attempts <= scenario.failures) throw injected;
        };
        t.mock.method(fs, "renameSync", (...args: Parameters<typeof fs.renameSync>) => {
          inject(args[1]);
          return actualRenameSync(...args);
        });
        t.mock.method(fsPromises, "rename", async (...args: Parameters<typeof fsPromises.rename>) => {
          inject(args[1]);
          return actualRename(...args);
        });
        syncBuiltinESMExports();
        const commit = async () => {
          if (mode === "invalidate") {
            assert.equal(await store.invalidateTarget(target, () => true, "stale target"), true);
          } else {
            store.upsert({ ...record, updatedAtMs: 2 });
            await store.persist();
          }
        };
        if (scenario.succeeds) {
          await commit();
          assert.equal(attempts, 3);
          const snapshot = JSON.parse(await readFile(path, "utf8"));
          assert.equal(snapshot.threads.length, mode === "invalidate" ? 0 : 1);
          if (mode !== "invalidate") assert.equal(snapshot.threads[0].updatedAtMs, 2);
          assert.equal(store.list().length, mode === "invalidate" ? 0 : 1);
        } else {
          await assert.rejects(commit, (error: NodeJS.ErrnoException) => error.code === scenario.code);
          assert.equal(attempts, scenario.code === "EPERM" ? 5 : 1);
          assert.equal(await readFile(path, "utf8"), before, "failed commits preserve the durable snapshot");
          assert.equal(store.list().length, 1, "failed invalidation must not publish its projection");
        }
        assert.deepEqual((await readdir(root)).filter((name) => name.endsWith(".tmp")), []);
      } finally {
        t.mock.restoreAll();
        syncBuiltinESMExports();
        await rm(root, { recursive: true, force: true });
      }
    });
  }
}
