import { rm, mkdir, cp } from 'fs/promises';
import path from 'node:path';

import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icons/icon',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: './assets/icons/win/icon.ico',
      iconUrl:
        'https://raw.githubusercontent.com/loarsaw/vigilant/refs/heads/master/assets/icons/win/icon.ico',
    }),
    new MakerDeb({
      options: {
        maintainer: 'loarsaw',
        homepage: 'https://github.com/loarsaw/vigilant',
        icon: './assets/icons/png/512x512.png',
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'loarsaw',
          name: 'vigilant',
        },
        prerelease: true,
      },
    },
  ],
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      const projectRoot = process.cwd();
      const sourceBuildDir = path.resolve(projectRoot, 'build');
      const destBuildDir = path.resolve(buildPath, 'build');

      try {
        await rm(destBuildDir, { recursive: true, force: true });
        await mkdir(destBuildDir, { recursive: true });
        await cp(sourceBuildDir, destBuildDir, {
          recursive: true,
          preserveTimestamps: true,
          dereference: true,
        });

        console.log(`Native addons synced successfully.`);
      } catch (error: any) {
        console.error(`Failed to sync build directory:`, error.message);
      }
    },
  },
};

export default config;
