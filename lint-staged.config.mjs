import path from 'path';

export default {
  'apps/web/src/**/*.{ts,tsx}': (files) => {
    const cwd = path.resolve('apps/web');
    const rel = files.map((f) => path.relative(cwd, f)).join(' ');
    return [`cd ${cwd} && pnpm exec eslint --fix --max-warnings=0 ${rel}`];
  },
  'apps/server/src/**/*.ts': (files) => {
    const cwd = path.resolve('apps/server');
    const rel = files.map((f) => path.relative(cwd, f)).join(' ');
    return [`cd ${cwd} && pnpm exec eslint --fix --max-warnings=0 ${rel}`];
  },
  '**/*.{ts,tsx,js,json,yml,yaml}': (files) =>
    `pnpm exec cspell --no-progress --no-summary ${files.join(' ')}`,
};
