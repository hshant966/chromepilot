# Reddit / Community Post

Title:

I built ChromePilot: local-first Chrome automation for any AI agent through MCP

Body:

I wanted a browser automation layer that works across AI tools instead of being locked to one vendor.

ChromePilot is a clean-room Chrome extension + local controller that lets MCP-capable agents control real Chrome profiles. It also exposes HTTP endpoints for tools like Hermes and local scripts.

Current V1:

- Chrome extension installed per profile
- local controller on 127.0.0.1
- MCP tools for Codex/Gemini/Claude-style clients
- HTTP adapter for Hermes
- side panel chat with OpenAI-compatible providers
- low-token page observation with refs
- click/type/scroll/navigate/screenshot
- optional bearer token
- password/OTP/payment typing blocked
- execute_js disabled by default

I am aiming for Claude Chrome extension-style browser automation, but open and provider-agnostic.

Repo: https://github.com/hshant966/chromepilot

Feedback wanted:

- better CDP event dispatch
- safer approval middleware
- provider adapters
- browser workflow examples
- MCP client compatibility reports
