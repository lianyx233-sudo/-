const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const cloudbaseConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'cloudbaserc.json'), 'utf8'),
);

const envId = process.env.CLOUDBASE_ENV_ID || cloudbaseConfig.envId;
const collections = [
  'users',
  'articles',
  'favorites',
  'works',
  'ai_contents',
  'surveys',
  'posts',
];

function runTcb(args) {
  if (process.env.PNPM_CLI) {
    return spawnSync(
      process.execPath,
      [process.env.PNPM_CLI, 'dlx', '--package', '@cloudbase/cli', 'tcb', ...args],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      },
    );
  }

  return spawnSync('tcb', args, {
    cwd: projectRoot,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}

function runNosqlCommand(label, command) {
  const result = runTcb([
    'db',
    'nosql',
    'execute',
    '-e',
    envId,
    '--command',
    JSON.stringify(command),
    '--json',
  ]);

  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

const now = new Date().toISOString();
const bootstrapCommands = collections.map((collection) => ({
  TableName: collection,
  CommandType: 'UPDATE',
  Command: JSON.stringify({
    update: collection,
    updates: [
      {
        q: { _id: '_bootstrap' },
        u: {
          $set: {
            _id: '_bootstrap',
            source: 'cloudbase-init-db',
            updatedAt: now,
          },
        },
        upsert: true,
      },
    ],
  }),
}));

const cleanupCommands = collections.map((collection) => ({
  TableName: collection,
  CommandType: 'DELETE',
  Command: JSON.stringify({
    delete: collection,
    deletes: [{ q: { _id: '_bootstrap' }, limit: 1 }],
  }),
}));

console.log(`Initializing CloudBase NoSQL collections in ${envId}...`);
runNosqlCommand('bootstrap collections', bootstrapCommands);
runNosqlCommand('cleanup bootstrap documents', cleanupCommands);
console.log('CloudBase NoSQL collections are initialized.');
