# Contributing

Thanks for helping improve ChromePilot.

## Good First Contributions

- Add browser workflow examples.
- Improve docs for MCP clients.
- Add provider adapters.
- Add tests around controller routing and safety checks.
- Improve page observation quality.

## Development

```bash
cd controller
npm install
npm test
node --check src/index.js
```

## Principles

- Keep the controller local-first.
- Avoid storing secrets.
- Return compact observations to save tokens.
- Prefer deterministic browser actions before model reasoning.
- Add human approval gates for risky workflows.

## Pull Requests

Include:

- what changed
- how it was tested
- security impact
- screenshots or terminal output when relevant
