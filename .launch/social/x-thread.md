# X / Twitter Launch Thread

Post 1:

I built ChromePilot: a local-first Chrome automation bridge for AI agents.

Codex, Gemini, Claude, Hermes, OpenRouter-backed agents, and local models can all control real Chrome profiles through one MCP/HTTP bridge.

No Anthropic API required. No remote browser cloud.

Post 2:

The missing piece for browser agents is usually not the model.

It is safe, profile-aware control of the browser you are already logged into:

- one extension per Chrome profile
- one local controller
- MCP tools
- HTTP adapter for Hermes
- side panel for direct tasks

Post 3:

V1 supports:

- list profiles and tabs
- observe page with low-token refs
- navigate
- click
- type
- press keys
- scroll
- screenshots
- optional trusted JS execution

Post 4:

Security defaults matter:

- controller binds to 127.0.0.1
- optional bearer token
- password/OTP/payment typing blocked
- input values are not returned in observations
- execute_js disabled by default

Post 5:

This is early, but usable.

I am building toward Claude Chrome extension-style automation that works with any AI tool.

Repo: https://github.com/hshant966/chromepilot

Stars, issues, and contributors welcome.
