/**
 * Regression tests for the declared host-peer boundary in development audits.
 * Covers SDK/dev overlap, shared owned dependencies and unknown-node fail-closed.
 */
import assert from "node:assert/strict";
import test from "node:test";

const resource = new URL("../scripts/audit-owned.mjs", import.meta.url).href;
const fixture = () => ({
  manifest: { peerDependencies: { host: "1.0.0" }, devDependencies: { host: "1.0.0", compiler: "1.0.0" } },
  lock: { packages: {
    "": {}, "node_modules/host": { dependencies: { shared: "1.0.0" } },
    "node_modules/compiler": {}, "node_modules/shared": {},
  } },
  report: { vulnerabilities: { shared: { severity: "high", nodes: ["node_modules/shared"] } } },
});

test("owned audit excludes declared host peers even when installed for development", async () => {
  const { classifyAudit } = await import(resource);
  const f = fixture();
  assert.deepEqual(classifyAudit(f.manifest, f.lock, f.report), {
    owned: [], host: [{ name: "shared", severity: "high", node: "node_modules/shared" }], unknown: [],
  });
});

test("owned audit cannot exempt a vulnerable dependency also reachable from an owned tool", async () => {
  const { classifyAudit } = await import(resource);
  const f = fixture();
  const lock = { packages: { ...f.lock.packages, "node_modules/compiler": { dependencies: { shared: "1.0.0" } } } };
  assert.equal(classifyAudit(f.manifest, lock, f.report).owned.length, 1);
  assert.equal(classifyAudit(f.manifest, lock, f.report).host.length, 0);
});

test("owned audit fences a missing graph node instead of silently hiding an advisory", async () => {
  const { classifyAudit } = await import(resource);
  const f = fixture();
  const report = { vulnerabilities: { untracked: { severity: "high", nodes: ["node_modules/untracked"] } } };
  assert.equal(classifyAudit(f.manifest, f.lock, report).unknown.length, 1);
});

test("owned audit rejects missing dependency edges and duplicated runtime host SDK declarations", async () => {
  const { classifyAudit } = await import(resource);
  const f = fixture();
  assert.throws(() => classifyAudit(f.manifest, { packages: { "": {} } }, f.report), /Missing locked dependency/);
  assert.throws(() => classifyAudit({ ...f.manifest, dependencies: { host: "1.0.0" } }, f.lock, f.report), /Host peer also declared as a runtime dependency/);
});
