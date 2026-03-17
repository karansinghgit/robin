const { MakerDeb } = require("@electron-forge/maker-deb");
const { MakerDMG } = require("@electron-forge/maker-dmg");
const { MakerRpm } = require("@electron-forge/maker-rpm");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");
const { WebpackPlugin } = require("@electron-forge/plugin-webpack");
const path = require("path");

const devPort = Number(process.env.ROBIN_FORGE_PORT || 3310);
const loggerPort = Number(process.env.ROBIN_FORGE_LOGGER_PORT || 9310);

function buildOsxSignConfig() {
  const identity = process.env.APPLE_SIGN_IDENTITY;

  if (!identity) {
    return undefined;
  }

  return {
    identity,
    hardenedRuntime: true
  };
}

function buildOsxNotarizeConfig() {
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    return undefined;
  }

  return {
    appleId,
    appleIdPassword,
    teamId
  };
}

module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: "com.robin.sidekick",
    appCategoryType: "public.app-category.productivity",
    executableName: "Robin",
    name: "Robin",
    osxSign: buildOsxSignConfig(),
    osxNotarize: buildOsxNotarizeConfig()
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG(
      {
        overwrite: true
      },
      ["darwin"]
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerSquirrel({}),
    new MakerDeb({}),
    new MakerRpm({})
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig: path.resolve(__dirname, "webpack.main.config.js"),
      port: devPort,
      loggerPort,
      renderer: {
        config: path.resolve(__dirname, "webpack.renderer.config.js"),
        entryPoints: [
          {
            html: path.resolve(__dirname, "src/renderer/index.html"),
            js: path.resolve(__dirname, "src/renderer/index.tsx"),
            name: "main_window",
            preload: {
              js: path.resolve(__dirname, "src/preload/index.ts")
            }
          }
        ]
      }
    })
  ]
};
