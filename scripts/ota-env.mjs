// Prints the build-time variables of the build profile behind an update
// channel, one KEY=value per line, for a CI step to append to $GITHUB_ENV:
//
//   node scripts/ota-env.mjs production >> "$GITHUB_ENV"
//
// Why this exists. Every EXPO_PUBLIC_* value is baked into the JavaScript
// bundle when it is made. A build gets them from its profile in eas.json;
// an over-the-air update is bundled on the CI runner, which knows nothing
// about eas.json profiles. Published without them, an update would reach
// every phone with no server address in it — the app would come up as if
// it had never had accounts. So the update is bundled with exactly the
// variables its channel's builds were built with, read from the same file,
// and this refuses to continue if the server address is not among them.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

function fail(message) {
  console.error(`ota-env: ${message}`);
  process.exit(1);
}

/** A profile with everything it inherits through `extends` folded in. */
function resolved(profiles, name, seen = []) {
  const profile = profiles[name];
  if (!profile) fail(`eas.json has no build profile "${name}"`);
  if (seen.includes(name)) fail(`build profiles extend each other in a circle: ${[...seen, name].join(' → ')}`);
  if (!profile.extends) return profile;
  const base = resolved(profiles, profile.extends, [...seen, name]);
  return { ...base, ...profile, env: { ...base.env, ...profile.env } };
}

const channel = process.argv[2];
if (!channel) fail('usage: node scripts/ota-env.mjs <channel>');

const profiles = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8')).build ?? {};

// The profile that names the channel itself, not one that inherits it: a
// simulator profile extending "preview" shares its channel but is not what
// "the preview builds" means.
const owner = Object.keys(profiles).find((name) => profiles[name].channel === channel);
if (!owner) fail(`no build profile in eas.json publishes to the channel "${channel}"`);

const env = resolved(profiles, owner).env ?? {};
const lines = [];
for (const [key, value] of Object.entries(env)) {
  if (!key.startsWith('EXPO_PUBLIC_')) continue;
  if (typeof value !== 'string' || /[\r\n]/.test(value)) fail(`${key} is not a single-line string`);
  lines.push(`${key}=${value}`);
}

for (const key of REQUIRED) {
  if (!env[key]) fail(`profile "${owner}" does not set ${key}; an update bundled without it would cut every player off from the server`);
}

console.log(lines.join('\n'));
