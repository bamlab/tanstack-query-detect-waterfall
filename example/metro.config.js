const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// The library is linked with `file:`, so without this it would resolve
// `@tanstack/query-core` / `lodash` from its OWN node_modules. Force both to the
// app's copies so the detector really runs against the app's react-query v5
// instance.
const forced = {
  "@tanstack/query-core": path.resolve(__dirname, "node_modules/@tanstack/query-core"),
  lodash: path.resolve(__dirname, "node_modules/lodash"),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [name, dir] of Object.entries(forced)) {
    if (moduleName === name || moduleName.startsWith(`${name}/`)) {
      return context.resolveRequest(
        context,
        path.join(dir, moduleName.slice(name.length)),
        platform
      );
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

config.watchFolders = [path.resolve(__dirname, "..")];

module.exports = config;
