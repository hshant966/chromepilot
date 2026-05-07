# LinkedIn Launch Post

I built ChromePilot, a local-first Chrome automation bridge for AI agents.

The goal is simple: let Codex, Gemini, Claude, Hermes, OpenRouter-backed agents, and local models control real Chrome profiles through one open bridge.

What it does today:

- Chrome extension installed per profile
- local controller on 127.0.0.1
- MCP tools for agent clients
- HTTP endpoints for Hermes and scripts
- side panel chat with OpenAI-compatible providers
- low-token page observations with actionable refs
- navigation, click, type, press, scroll, screenshots

Security defaults:

- optional bearer token
- password, OTP, and payment-field typing blocked
- observations do not return input values
- JavaScript execution disabled by default

This is early, but the foundation is working. I am building toward provider-agnostic browser automation with Claude Chrome extension-style ergonomics.

Repo: https://github.com/hshant966/chromepilot
