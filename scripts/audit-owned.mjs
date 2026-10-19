/** Audit the owned dependency closure, retaining findings in host-supplied peers. */
import { readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function classifyAudit(manifest, lock, report) {
  const packages = lock.packages;
  if (!packages || !report.vulnerabilities) throw new Error("Missing audit or locked dependency graph");
  const peers = new Set(Object.keys(manifest.peerDependencies ?? {}));
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (peers.has(name)) throw new Error(`Host peer also declared as a runtime dependency: ${name}`);
  }
  function dependency(issuer, name) {
    let directory = issuer;
    while (directory && directory !== ".") {
      const candidate = `${directory}/node_modules/${name}`;
      if (packages[candidate]) return candidate;
      directory = posix.dirname(directory);
    }
    const candidate = `node_modules/${name}`;
    return packages[candidate] ? candidate : undefined;
  }
  function closure(roots) {
    const reached = new Set();
    const queue = [...roots];
    while (queue.length) {
      const node = queue.pop();
      if (reached.has(node)) continue;
      reached.add(node);
      const entry = packages[node];
      if (!entry) throw new Error(`Missing locked dependency: ${node}`);
      for (const name of Object.keys(entry.dependencies ?? {})) {
        const target = dependency(node, name);
        if (!target) throw new Error(`Missing locked dependency: ${node} -> ${name}`);
        queue.push(target);
      }
      for (const name of Object.keys(entry.optionalDependencies ?? {})) {
        const target = dependency(node, name);
        if (target) queue.push(target);
      }
    }
    return reached;
  }
  const rootNames = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  const ownedRoots = rootNames.filter(name => !peers.has(name)).map(name => {
    const node = dependency("", name);
    if (!node) throw new Error(`Missing locked dependency: ${name}`);
    return node;
  });
  const hostRoots = [...peers].map(name => dependency("", name)).filter(Boolean);
  const ownedNodes = closure(ownedRoots);
  const hostNodes = closure(hostRoots);
  const result = { owned: [], host: [], unknown: [] };
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (!Array.isArray(finding.nodes) || !finding.nodes.length) throw new Error(`Missing vulnerability nodes: ${name}`);
    for (const node of finding.nodes) {
      const group = ownedNodes.has(node) ? "owned" : hostNodes.has(node) ? "host" : "unknown";
      result[group].push({ name, severity: finding.severity, node });
    }
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    if (!process.env.npm_execpath) throw new Error("Run through npm run audit");
    const run = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--omit=peer", "--json"], { cwd: root, encoding: "utf8", timeout: 60000 });
    if (run.error || run.signal || ![0, 1].includes(run.status)) throw run.error ?? new Error("npm audit did not complete normally");
    const report = JSON.parse(run.stdout);
    if (report.error) throw new Error(`npm audit failed: ${report.error.code ?? "unknown"}`);
    const result = classifyAudit(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")), JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8")), report);
    console.log(JSON.stringify(result, null, 2));
    if (result.host.length) console.warn("Host-peer advisories remain visible; this audit does not certify or repair Pi. Use npm run audit:host for the full graph.");
    process.exitCode = result.owned.length || result.unknown.length ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
