# Safety Model

ChromePilot is intended for automation in browser sessions you control.

Human approval is required before:

- payments or purchases
- entering passwords, OTPs, recovery codes, or API keys
- banking, trading, crypto, insurance, or government actions
- deleting data
- sending bulk messages or emails
- accepting legal terms or consent dialogs

Current enforced defaults:

- HTTP and WebSocket traffic can require `CHROMEPILOT_TOKEN`.
- Password, OTP, and payment-field typing is blocked.
- Page observations do not return input values.
- `execute_js` is disabled unless explicitly enabled in both controller and extension state.

Next hardening layer: controller middleware that classifies URLs, fields, and requested actions before dispatching tool calls.
