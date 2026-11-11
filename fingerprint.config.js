/**
 * What counts as "the native side changed".
 *
 * An over-the-air update is only offered to builds whose native fingerprint
 * equals the one the update was published from (see `runtimeVersion` in
 * app.json). By default that fingerprint also moves when files move that no
 * build ever compiles in, and each such move would quietly strand an update
 * on the server with no build left to receive it. Those are taken out here:
 *
 *  - package.json scripts and .gitignore — developer tooling;
 *  - eas.json — build channels and build-time variables, which decide where
 *    a build looks for updates, not what native code is in it;
 *  - the app's version numbers — a build that only differs by its version
 *    runs the same JavaScript.
 *
 * Everything that really is native stays in: the installed native modules,
 * their versions, config plugins, the icon, and the rest of app.json.
 *
 * @type {import('@expo/fingerprint').Config}
 */
module.exports = {
  sourceSkips: ['PackageJsonScriptsAll', 'GitIgnore', 'ExpoConfigVersions'],
  ignorePaths: ['eas.json'],
};
