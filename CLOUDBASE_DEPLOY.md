# CloudBase deployment

This project is configured for Tencent CloudBase environment:

- Environment ID: `dianyuwanjia1-d4gy47isafba6b3ce`
- Region: `ap-shanghai`
- Web service name: `ydys`
- API function: `apiEvent`
- API route: `/api`

## Prerequisites

1. Install and log in to CloudBase CLI:

```bash
npm install -g @cloudbase/cli
tcb login
```

2. Set the AI image API key as the `AIHUBMIX_API_KEY` environment variable on the `apiEvent` cloud function.

You can set it in the CloudBase console, or temporarily put it in `cloudbaserc.json` under `functions[0].envVariables.AIHUBMIX_API_KEY` before running:

```bash
tcb config update fn apiEvent
```

## Deploy

```bash
npm run build:web
npm run cloudbase:init-db
npm run cloudbase:deploy:api
npm run cloudbase:deploy:web
```

Or after the CLI is logged in:

```bash
npm run cloudbase:deploy
```

## GitHub Actions auto deploy

The repository includes `.github/workflows/cloudbase-deploy.yml`.

Add these repository secrets in GitHub:

- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`
- `AIHUBMIX_API_KEY`

Every push to `main` will run:

```bash
npm ci
npm run lint
npm run build:web
npm install -g @cloudbase/cli
tcb login --apiKeyId "$TENCENT_SECRET_ID" --apiKey "$TENCENT_SECRET_KEY"
npm run cloudbase:deploy:ci
```

`npm run cloudbase:deploy:ci` temporarily injects `AIHUBMIX_API_KEY` into
`cloudbaserc.json` for the cloud function deployment, then restores the local
file so the key is not committed.

## CloudBase console repository connection

If you use the CloudBase console's native GitHub repository connection, use:

- Branch: `main`
- Install command: `npm ci`
- Build command: `npm run build:web`
- Output directory: `dist`
- Deploy path: `/`
- Environment variables:
  - `VITE_TCB_ENV_ID=dianyuwanjia1-d4gy47isafba6b3ce`
  - `VITE_TCB_REGION=ap-shanghai`
  - `VITE_API_BASE_URL=https://dianyuwanjia1-d4gy47isafba6b3ce.service.tcloudbase.com/api`

Keep the API function deployment in GitHub Actions unless the console workflow
also supports deploying `functions/api` with the `AIHUBMIX_API_KEY` secret.

## Database collections

The app uses these CloudBase NoSQL collections:

- `users`
- `articles`
- `favorites`
- `works`
- `ai_contents`
- `surveys`
- `posts`

Review database and storage permissions in the CloudBase console before public launch.
