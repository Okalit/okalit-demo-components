import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
  plugins: [
    pluginSass(),
    pluginBabel({
      include: /\.(j|t)s$/,
      babelLoaderOptions: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { "version": "2023-05" }]
        ],
      },
    }),
  ],
  html: {
    template: './index.html',
  },
  source: {
    entry: {
      index: './demo.js', 
    },
  },
});