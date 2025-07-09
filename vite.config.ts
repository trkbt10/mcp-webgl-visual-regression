import { defineConfig } from 'vite';
import { resolve } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: {
        server: resolve(__dirname, 'src/server.ts'),
        'cli/webgl-debugger': resolve(__dirname, 'src/cli/webgl-debugger.ts'),
        'tools/test-capture-canvas': resolve(__dirname, 'src/tools/test-capture-canvas.ts'),
        'tools/test-capture-screenshots': resolve(__dirname, 'src/tools/test-capture-screenshots.ts'),
        'tools/test-mcp-server': resolve(__dirname, 'src/tools/test-mcp-server.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:url',
        'node:util',
        'node:crypto',
        'node:child_process',
        'node:stream',
        'node:os',
        'node:events',
        'node:buffer',
        'fs',
        'path',
        'url',
        'util',
        'crypto',
        'child_process',
        'stream',
        'os',
        'events',
        'buffer',
        'puppeteer',
        'sharp',
        '@modelcontextprotocol/sdk',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/types.js',
        'hono',
        'hono/serve-static',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
    sourcemap: false,
    minify: false,
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ['node'],
    }),
    commonjs(),
    dts({
      rollupTypes: false,
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    conditions: ['node'],
  },
});