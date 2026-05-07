# Hacker News Post

Title:

Show HN: ChromePilot - local Chrome automation bridge for AI agents

Text:

ChromePilot is a clean-room Chrome extension + local controller that exposes real Chrome profiles to AI tools over MCP and HTTP.

I built it because many agents can reason well, but cannot reliably control the browser profile where you are already logged in. ChromePilot installs one extension per Chrome profile and connects them to a local controller on 127.0.0.1.

V1 supports profile routing, tabs, navigation, low-token page observation with refs, click/type/press/scroll, screenshots, an MCP server, an HTTP adapter for Hermes/scripts, and a side panel with OpenAI-compatible providers.

Security defaults: optional bearer token, password/OTP/payment typing blocked, input values not returned in observations, execute_js disabled by default.

Repo: https://github.com/hshant966/chromepilot
