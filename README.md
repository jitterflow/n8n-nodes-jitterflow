# 🔌 n8n-nodes-jitterflow

An [n8n](https://n8n.io) community node for [Jitterflow](https://jitterflow.io) — jittered, rate-limited webhook delivery with a dead-letter queue, right inside your workflows.

> **🔑 What this buys you:** send a webhook through Jitterflow's pacing/retry engine, then list, replay, or resolve anything that ends up in the dead-letter queue — without leaving n8n.

All jitter math, TPS guarding, and DLQ decisioning happen server-side in Jitterflow. This node is a thin, typed client over the real REST API — the same contract [`@jitterflow/sdk-node`](https://jitterflow.io) uses.

---

## ✨ What it does

| Resource | Operation | What happens |
|---|---|---|
| **Webhook** | Send | Queues a webhook for delayed, jittered redelivery via `POST /v1/ingest/:endpointKey` |
| **DLQ** | List | Lists dead-letter queue entries, filterable by resolved/unresolved |
| **DLQ** | Replay | One-click re-enqueues a failed job for immediate redelivery |
| **DLQ** | Resolve | Marks an entry resolved without retrying it |

**Two details worth knowing about Send:**

- **Target Identifier** — optional; paces delivery per this identifier (a mailbox, a lead ID, whatever) instead of per endpoint. Defaults server-side to the endpoint key if left blank.
- **Idempotency Key** — defaults to `{{$execution.id}}-{{$itemIndex}}`, so a workflow retry never double-sends the same item.

---

## 📦 Install

| Platform | How |
|---|---|
| **Self-hosted n8n** | Settings → Community Nodes → install `n8n-nodes-jitterflow` |
| **n8n Cloud** | Available once the node clears n8n's verification review (submitted via the [Creator Portal](https://creators.n8n.io/nodes)) |

---

## 🔑 Credential

No Jitterflow account yet? [Sign up free](https://jitterflow.io/signup/?ref=n8n-node) — takes about two minutes.

Create a **Jitterflow API** credential:

- [ ] Grab your tenant API key from the Jitterflow dashboard → **API Keys** (starts with `wjg_`)
- [ ] Paste it into the credential's **API Key** field
- [ ] Hit **Test** — it calls `GET /v1/endpoints` to confirm the key actually works

---

## 🛠️ Development

> This package was split out of the main [jitterflow-core-app](https://github.com/jitterflow/jitterflow-core-app) monorepo so it could be a public repo, per n8n's verification requirements. Day-to-day development — including integration/e2e tests against a real Jitterflow API instance — still happens there. This repo carries the standalone-buildable unit tests and is what actually gets published.

```bash
npm ci
npm run build   # n8n-node build
npm run lint    # n8n-node lint — the verification-readiness check
npm test
```

---

## 🚀 Release

```bash
npm run release
```

| Step | What it does |
|---|---|
| `npm run release` | Bumps the version, tags, and pushes |
| `.github/workflows/publish.yml` | Takes it from there — build, `n8n-node lint`, publish to npm with provenance |

> **🔑 Auth:** publishing uses npm's OIDC Trusted Publishing (configured on npmjs.com against this exact repo + workflow) — no `NPM_TOKEN` secret needed or used.
