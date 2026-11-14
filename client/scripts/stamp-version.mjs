// Writes the version from package.json into the app's header badge and the service worker (single source of truth).
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const semver = version.split("+")[0];

const stamp = (file, pattern, replacement) => {
  const path = new URL(`../public/${file}`, import.meta.url);
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);
  if (!pattern.test(before)) throw new Error(`stamp-version: pattern not found in ${file}`);
  if (after !== before) writeFileSync(path, after);
};

stamp("app.html", /(id="versionBadge"[^>]*>)v[\d.]+(<)/, `$1v${semver}$2`);
stamp("sw.js", /(const VERSION = ')[\d.]+(')/, `$1${semver}$2`);
console.log(`stamped v${semver}`);
