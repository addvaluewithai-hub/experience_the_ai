# Deploying to Cloudflare Pages

## Connect the repository

Workers & Pages → Create → Pages → Connect to Git → `addvaluewithai-hub/experience_the_ai`.

| Setting                | Value                                             |
| ---------------------- | ------------------------------------------------- |
| Production branch      | `main` once it exists; until then the work branch |
| Framework preset       | None                                              |
| Build command          | `npm run build`                                   |
| Build output directory | `dist`                                            |
| Root directory         | empty (repository root)                           |

Node comes from `.node-version` (24). Pages installs with `npm ci` from the lockfile and builds
`functions/` (the `/api/*` routes) automatically. `wrangler.jsonc` is the project's config, so
plain variables cannot be edited in the dashboard; everything below is a secret.

## Secrets (Settings → Variables and Secrets, type Secret)

| Name                | Value                                     | Notes                                      |
| ------------------- | ----------------------------------------- | ------------------------------------------ |
| `GEMINI_API_KEY`    | key from Google AI Studio                 | Never in Git or the client bundle          |
| `OPEN_AI_PREVIEW`   | `true` to let characters talk             | Anything else, or missing, keeps AI closed |
| `GEMINI_CHAT_MODEL` | optional, default `gemini-3.5-flash-lite` | Must be a model the key's tier can use     |

Set them for the environment you test on (Production and/or Preview), then redeploy: secrets
apply to new deployments only.

## Free tier

The default model is the free tier's largest text quota (15 requests a minute, 500 a day).
One message can take several requests when a character uses tools. With `OPEN_AI_PREVIEW=true`
and no accounts, anyone with the link spends the same daily quota, so share preview links
only. On a free key that means "the AI is busy" errors, not charges. Before turning on billing,
close the AI (`OPEN_AI_PREVIEW` removed) until accounts and per-account quotas exist.

## Check a deployment

1. `https://<deployment>/api/status` returns `{"ai":true}` when both secrets are set.
2. Open a room, talk to a character, ask it to add something, and see the panel change.
3. If a character replies with an error, the message is the server's real reason (missing key,
   busy quota, provider failure). Nothing is invented.
