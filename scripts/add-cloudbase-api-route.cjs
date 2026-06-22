const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const cloudbaseConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'cloudbaserc.json'), 'utf8'),
);

const envId = process.env.CLOUDBASE_ENV_ID || cloudbaseConfig.envId;

function runTcb(args) {
  if (process.env.PNPM_CLI) {
    return spawnSync(
      process.execPath,
      [process.env.PNPM_CLI, 'dlx', '--package', '@cloudbase/cli', 'tcb', ...args],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      },
    );
  }

  return spawnSync('tcb', args, {
    cwd: projectRoot,
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
}

const data = {
  domain: '*',
  routes: [
    {
      path: '/api',
      upstreamResourceType: 'SCF',
      upstreamResourceName: 'apiEvent',
      enable: true,
      enableAuth: false,
      enablePathTransmission: false,
    },
  ],
};

const result = runTcb([
  'routes',
  'add',
  '-e',
  envId,
  '--data',
  JSON.stringify(data),
  '--yes',
  '--json',
]);

const output = `${result.stdout || ''}${result.stderr || ''}`;

if (result.status !== 0) {
  const duplicateRoute =
    output.includes('INVALID_PARAM') &&
    output.includes('/api') &&
    (output.toLowerCase().includes('exist') || output.includes('已存在'));

  if (duplicateRoute) {
    console.log('CloudBase /api route already exists.');
    process.exit(0);
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error('Failed to add CloudBase /api route');
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
