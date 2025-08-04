import esbuild from 'esbuild';
import builtins from 'builtin-modules';
import { readFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

const prod = process.argv[2] === 'production';

const buildOptions = {
  entryPoints: ['main.ts'],
  bundle: true,
  external: ['obsidian', ...builtins],
  format: 'cjs',
  target: 'es2017',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  define: {
    'process.env.NODE_ENV': prod ? '"production"' : '"development"',
    'process.env.PLUGIN_VERSION': '"' + manifest.version + '"'
  }
};

if (prod) {
  esbuild.build(buildOptions).catch(() => process.exit(1));
} else {
  // 开发模式下使用watch模式
  esbuild.context(buildOptions)
    .then(ctx => ctx.watch())
    .catch(() => process.exit(1));
}