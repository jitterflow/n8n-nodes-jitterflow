# 🧩 Jitterflow n8n templates

Three importable workflow templates (n8n: **Workflows → Import from File**). Each `.json` carries its own `meta.description` and `meta.setup` steps.

| Template | What it solves |
|---|---|
| `rate-limit-shopify-erp-sync.json` | Verify each Shopify order webhook's signature, map it to an ERP import shape and spread a burst so it never exceeds your ERP's rate limit. A daily lane posts a Slack summary of orders that landed in the DLQ. |
| `pace-new-leads-into-crm.json` | Read new rows from a Google Sheet, clean and validate each email, and push the leads into your CRM one at a time at its API's rate limit, keyed by email so none is created twice. Each row gets its status and job ID; a daily lane writes CRM rejections from the DLQ back to the sheet. |
| `replay-failed-webhooks-from-slack.json` | One Slack slash command lists and replays every unresolved DLQ entry — the free-to-paid conversion moment, from inside Slack. ✅ Published in the n8n gallery: [workflow 20166](https://n8n.io/workflows/20166-replay-failed-jitterflow-dlq-webhooks-from-a-slack-slash-command/) |

> **⚠️ Before importing:** replace each `YOUR_JITTERFLOW_ENDPOINT_KEY` placeholder and re-select the **Jitterflow API** credential (plus the **Crypto** and **Slack** credentials in the Shopify template, and **Google Sheets** in the CRM one) — the placeholder credential IDs in these files won't exist in your instance.

Submitting these to n8n's own template gallery (`https://n8n.io/workflows/`) requires an n8n account.
