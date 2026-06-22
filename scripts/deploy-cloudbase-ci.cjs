const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'cloudbaserc.json');
const utf8NoBom = new TextEncoder();

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function writeJsonNoBom(filePath, data) {
  fs.writeFileSync(filePath, utf8NoBom.encode(`${JSON.stringify(data, null, 2)}\n`));
}

const originalConfigText = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
const config = JSON.parse(originalConfigText);
const envId = process.env.CLOUDBASE_ENV_ID || config.envId;
const aiHubMixApiKey = process.env.AIHUBMIX_API_KEY;

if (!aiHubMixApiKey) {
  throw new Error('Missing AIHUBMIX_API_KEY environment variable');
}

try {
  config.envId = envId;
  config.functions = config.functions || [];
  config.functions[0] = config.functions[0] || {};
  config.functions[0].envVariables = {
    ...(config.functions[0].envVariables || {}),
    AIHUBMIX_API_KEY: aiHubMixApiKey,
  };

  writeJsonNoBom(configPath, config);

  run('tcb', ['fn', 'deploy', 'apiEvent', '--dir', 'functions/api', '--force']);
  run(process.execPath, ['scripts/add-cloudbase-api-route.cjs']);
  run('tcb', [
    'deploy',
    'ydys',
    '--framework',
    'vite',
    '--install-command',
    'npm ci',
    '--build-command',
    'npm run build:web',
    '--output-dir',
    'dist',
    '--deploy-path',
    '/',
    '--force',
  ]);
} finally {
  fs.writeFileSync(configPath, utf8NoBom.encode(originalConfigText));
}
