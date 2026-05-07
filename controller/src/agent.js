const DEFAULT_SYSTEM_PROMPT = `You are ChromePilot, a browser automation planner.
Return exactly one JSON object and no markdown.
Allowed tools: tabs.list, page.navigate, page.observe, page.click, page.type, page.press, page.scroll, page.screenshot, page.executeJs, done.
Prefer page.observe before interacting. Use refs like @12 from observe output. Keep actions small and verifiable.
Schema: {"tool":"page.observe","params":{}} or {"tool":"done","answer":"..."}.
Ask for human help in the answer if the task needs payments, passwords, banking, trading, deleting data, or bulk messaging.`;

export async function runAgentTask({ task, registry, profileId, maxSteps = 12 }) {
  const apiKey = process.env.CHROMEPILOT_OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.CHROMEPILOT_OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.CHROMEPILOT_MODEL || "openrouter/auto";

  if (!apiKey) {
    throw new Error("Set CHROMEPILOT_OPENAI_API_KEY or OPENROUTER_API_KEY to use side-panel agent mode.");
  }

  const messages = [
    { role: "system", content: DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: task },
  ];
  const steps = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const decision = await callOpenAiCompatible({ apiKey, baseUrl, model, messages });
    const parsed = parseJsonDecision(decision);

    steps.push(parsed);
    if (parsed.tool === "done") {
      return { answer: parsed.answer || "Done.", steps };
    }

    const result = await registry.request(profileId, parsed.tool, parsed.params || {});
    messages.push({ role: "assistant", content: JSON.stringify(parsed) });
    messages.push({
      role: "user",
      content: `Tool result for ${parsed.tool}:\n${trimToolResult(result)}`,
    });
  }

  return {
    answer: "Stopped after max steps. Review the visible browser state and continue if needed.",
    steps,
  };
}

async function callOpenAiCompatible({ apiKey, baseUrl, model, messages }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://127.0.0.1:4777",
      "X-Title": "ChromePilot",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider error ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || "";
}

function parseJsonDecision(text) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  if (!jsonText) throw new Error(`Model did not return JSON: ${text}`);
  return JSON.parse(jsonText);
}

function trimToolResult(result) {
  const text = typeof result === "string" ? result : JSON.stringify(result);
  return text.length > 10_000 ? `${text.slice(0, 10_000)}\n...[trimmed]` : text;
}
