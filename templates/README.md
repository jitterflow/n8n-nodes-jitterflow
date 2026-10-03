# 🧩 Jitterflow n8n templates

Three importable workflow templates (n8n: **Workflows → Import from File**). Each `.json` carries its own `meta.description` and `meta.setup` steps.

| Template | What it solves |
|---|---|
| `rate-limit-shopify-erp-sync.json` | Spread a burst of Shopify order webhooks so they never exceed your ERP's per-second rate limit. |
| `pace-new-leads-into-crm.json` | Push a batch of new leads into your CRM one at a time at its API's rate limit, with each lead's email as the idempotency key so none is created twice. |
| `replay-failed-webhooks-from-slack.json` | One Slack slash command lists and replays every unresolved DLQ entry — the free-to-paid conversion moment, from inside Slack. |

> **⚠️ Before importing:** replace each `YOUR_JITTERFLOW_ENDPOINT_KEY` placeholder and re-select the **Jitterflow API** credential — the placeholder credential ID in these files won't exist in your instance.

Submitting these to n8n's own template gallery (`https://n8n.io/workflows/`) requires an n8n account.
