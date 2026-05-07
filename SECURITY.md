# Security Policy

ChromePilot controls real browser sessions. Treat it as a powerful local automation tool.

## Supported Versions

Only the latest `main` branch is supported during the early preview.

## Reporting

Please open a GitHub security advisory or a private issue with:

- affected version or commit
- reproduction steps
- expected vs actual behavior
- impact

Do not include real cookies, tokens, passwords, or screenshots containing secrets.

## Defaults

- The controller binds to `127.0.0.1`.
- `CHROMEPILOT_TOKEN` can protect HTTP and extension WebSocket traffic.
- Password, OTP, and payment fields are blocked for typing.
- `chromepilot_execute_js` is disabled unless `CHROMEPILOT_ALLOW_EXECUTE_JS=true`.
- The extension also blocks `page.executeJs` unless `allowDangerousJs` is explicitly set in extension local storage.

## High-Risk Use

Do not run autonomous tasks on banking, trading, crypto, healthcare, government, or payment pages without human review.
