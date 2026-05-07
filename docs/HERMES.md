# Hermes Integration

ChromePilot exposes HTTP endpoints so Hermes can use the same browser bridge without needing a Claude-specific integration.

Base URL:

```text
http://127.0.0.1:4777
```

If `CHROMEPILOT_TOKEN` is set, include:

```text
Authorization: Bearer <token>
```

Useful endpoints:

```text
GET  /health
GET  /api/profiles
POST /api/tool/:tool
POST /api/agent/run
```

Tool names are the same as MCP:

```text
chromepilot_profiles_list
chromepilot_tabs_list
chromepilot_tab_select
chromepilot_navigate
chromepilot_observe
chromepilot_click
chromepilot_type
chromepilot_press
chromepilot_scroll
chromepilot_screenshot
chromepilot_execute_js
```

Example Hermes/browser workflow:

```bash
curl -s http://127.0.0.1:4777/api/profiles

curl -s -X POST http://127.0.0.1:4777/api/tool/chromepilot_observe \
  -H 'Content-Type: application/json' \
  -d '{"profileId":"Profile 7","maxItems":80}'
```

For autonomous side-panel/HTTP agent mode, start the controller with an OpenAI-compatible backend:

```bash
CHROMEPILOT_OPENAI_BASE_URL="http://127.0.0.1:20128/v1" \
CHROMEPILOT_OPENAI_API_KEY="local" \
CHROMEPILOT_MODEL="your-model" \
~/chromepilot/scripts/start-controller.sh
```
