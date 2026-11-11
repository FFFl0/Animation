import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { MIN_CHECK_GAP_MS, dueForCheck, otaEnabled, otaInfo, useOtaUpdate } from '../ota';

/**
 * Over-the-air updates are mostly configuration: a few lines in four files
 * that have to agree, and that fail without a sound when they do not — an
 * update that reaches nobody, or one that reaches everybody with the
 * server address missing. No phone is needed to check that they agree.
 */
const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const APP = JSON.parse(read('app.json')).expo;
const EAS = JSON.parse(read('eas.json'));
const WORKFLOW = read('.github/workflows/eas-update.yml');
const SCRIPT = join(ROOT, 'scripts/ota-env.mjs');

function otaEnv(channel: string): Record<string, string> {
  const out = execFileSync('node', [SCRIPT, channel], { encoding: 'utf8' });
  return Object.fromEntries(out.trim().split('\n').map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

/** The channels the publish workflow offers. */
function workflowChannels(): string[] {
  const block = WORKFLOW.slice(WORKFLOW.indexOf('      channel:'), WORKFLOW.indexOf('      platform:'));
  return [...block.matchAll(/^\s+- (\w+)$/gm)].map((m) => m[1]);
}

describe('when to look for an update', () => {
  it('waits out the gap, then checks', () => {
    expect(dueForCheck(MIN_CHECK_GAP_MS - 1, 0)).toBe(false);
    expect(dueForCheck(MIN_CHECK_GAP_MS, 0)).toBe(true);
  });

  it('stays out of the way where there is nothing to update', () => {
    // Jest, like a dev server or the web build, is not an installed build.
    expect(otaEnabled).toBe(false);
    expect(otaInfo()).toBeNull();
    expect(useOtaUpdate().ready).toBe(false);
  });
});

describe('which builds an update may reach', () => {
  it('is decided by a fingerprint of the native side, not by a version somebody has to remember to bump', () => {
    expect(APP.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  it('asks the update server about this project', () => {
    expect(APP.updates.url).toBe(`https://u.expo.dev/${APP.extra.eas.projectId}`);
  });

  it('only skips fingerprint inputs the library knows by name', () => {
    // A misspelt name is ignored without a word, and the fingerprint goes
    // back to moving on every edit of package.json scripts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SourceSkips } = require('@expo/fingerprint');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(join(ROOT, 'fingerprint.config.js'));
    expect(config.sourceSkips.length).toBeGreaterThan(0);
    for (const name of config.sourceSkips) expect(typeof SourceSkips[name]).toBe('number');
    // Skipping the whole app config would let a new native plugin through.
    expect(config.sourceSkips).not.toContain('ExpoConfigAll');
  });

  it('ships the library the configuration is for', () => {
    expect(JSON.parse(read('package.json')).dependencies['expo-updates']).toBeDefined();
  });
});

describe('channels', () => {
  it.each(['preview', 'production'])('builds made with the %s profile listen on the channel of the same name', (name) => {
    expect(EAS.build[name].channel).toBe(name);
  });

  it('offers to publish only to channels some build listens on', () => {
    const channels = workflowChannels();
    expect(channels.length).toBeGreaterThan(0);
    const listening = Object.values(EAS.build as Record<string, { channel?: string }>).map((p) => p.channel);
    for (const channel of channels) expect(listening).toContain(channel);
  });
});

describe('what an update is bundled with', () => {
  it.each(['preview', 'production'])('gives a %s update the variables its builds were built with', (channel) => {
    const expected = Object.fromEntries(
      Object.entries(EAS.build[channel].env as Record<string, string>).filter(([key]) => key.startsWith('EXPO_PUBLIC_'))
    );
    expect(otaEnv(channel)).toEqual(expected);
    expect(otaEnv(channel).EXPO_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\//);
  });

  it('refuses a channel no build listens on', () => {
    expect(() => execFileSync('node', [SCRIPT, 'nightly'], { stdio: 'pipe' })).toThrow();
  });

  it('is loaded before the bundle is made, and the bundle is not made before a build is found for it', () => {
    const at = (text: string) => {
      const index = WORKFLOW.indexOf(text);
      expect(index).toBeGreaterThan(-1);
      return index;
    };
    const env = at('node scripts/ota-env.mjs "$CHANNEL" >> "$GITHUB_ENV"');
    const check = at('eas-cli build:list');
    const publish = at('eas-cli update --channel "$CHANNEL"');
    expect(env).toBeLessThan(publish);
    expect(check).toBeLessThan(publish);
    // Tests run before anything is sent to players' phones.
    expect(at('npx jest')).toBeLessThan(publish);
  });
});

describe('the banner', () => {
  it.each(['ru', 'en'] as const)('has its words in %s', (lang) => {
    const t = getT(lang);
    for (const key of ['update.readyTitle', 'update.readyText', 'update.restart', 'about.update', 'about.updateEmbedded']) {
      expect(t(key)).not.toBe(key);
    }
  });
});
