# n8n-nodes-jitterflow

An [n8n](https://n8n.io) community node for [Jitterflow](https://jitterflow.io) — jittered, rate-limited webhook delivery with a dead-letter queue.

## What it does

- **Webhook -> Send**: queues a webhook for delayed, jittered redelivery via `POST /v1/ingest/:endpointKey`. Supports a per-item `Target Identifier` (paces delivery per mailbox/lead/etc. instead of per endpoint) and an `Idempotency Key` that defaults to `{{$execution.id}}-{{$itemIndex}}`, so a workflow retry never double-sends.
- **DLQ -> List / Replay / Resolve**: manage the dead-letter queue from inside a workflow — list failed deliveries, one-click replay a job for immediate redelivery, or mark an entry resolved without retrying.

All jitter math, TPS guarding, and DLQ decisioning happen server-side in Jitterflow — this node is a thin, typed client over the real REST API (the same contract `@jitterflow/sdk-node` uses).

## Install

**Self-hosted n8n**: Settings -> Community Nodes -> install `n8n-nodes-jitterflow`.

**n8n Cloud**: available once the node passes n8n's verification review (submitted via [n8n's Creator Portal](https://creators.n8n.io/nodes)).

## Credential

Create a **Jitterflow API** credential with your tenant API key (Jitterflow dashboard -> API Keys, starts with `wjg_`). Use the "Test" button to confirm it against `GET /v1/endpoints`.

## Development

This package was split out of the main [jitterflow-core-app](https://github.com/jitterflow/jitterflow-core-app) monorepo so it can be a public repo, per n8n's verification requirements — day-to-day development (including integration/e2e tests against a real Jitterflow API instance) still happens there; this repo carries the standalone-buildable unit tests and is what gets published.

```
npm ci
npm run build   # n8n-node build
npm run lint    # n8n-node lint — the verification-readiness check
npm test
```

## Release

```
npm run release
```

Bumps the version, tags, and pushes — `.github/workflows/publish.yml` takes it from there (build, `n8n-node lint`, publish to npm with provenance). Requires the `NPM_TOKEN` repo secret.
