import * as z from "zod/v4";

export const browserToolSchemas = {
  chromepilot_profiles_list: {
    description: "List Chrome profiles currently connected to ChromePilot.",
    inputSchema: {},
    readOnlyHint: true,
  },
  chromepilot_tabs_list: {
    description: "List tabs for a connected Chrome profile.",
    inputSchema: {
      profileId: z.string().optional().describe("Chrome profile id, for example Profile 7. Defaults to the active connected profile."),
    },
    readOnlyHint: true,
  },
  chromepilot_tab_select: {
    description: "Activate a tab in a connected Chrome profile.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().describe("Chrome tab id from chromepilot_tabs_list."),
    },
  },
  chromepilot_navigate: {
    description: "Navigate a tab to a URL.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      url: z.string().url().describe("Destination URL."),
    },
  },
  chromepilot_observe: {
    description: "Return a compact, low-token page snapshot with numbered refs for links, buttons, inputs, and other actionable elements.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      maxItems: z.number().int().min(1).max(300).optional(),
    },
    readOnlyHint: true,
  },
  chromepilot_click: {
    description: "Click an element by ref from chromepilot_observe.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      ref: z.string().describe("Element ref, for example @12."),
    },
  },
  chromepilot_type: {
    description: "Type text into an element by ref from chromepilot_observe.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      ref: z.string(),
      text: z.string(),
      clear: z.boolean().optional().describe("Clear existing value before typing."),
    },
  },
  chromepilot_press: {
    description: "Send a keyboard key or shortcut to the active page.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      key: z.string().describe("Examples: Enter, Escape, Tab, Ctrl+L."),
    },
  },
  chromepilot_scroll: {
    description: "Scroll the active page.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      direction: z.enum(["up", "down", "left", "right"]).default("down"),
      amount: z.number().int().min(100).max(5000).default(800),
    },
  },
  chromepilot_screenshot: {
    description: "Capture a screenshot of the active tab.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      fullPage: z.boolean().optional(),
    },
    readOnlyHint: true,
  },
  chromepilot_execute_js: {
    description: "Execute JavaScript in the page. Use only when observe/click/type are insufficient.",
    inputSchema: {
      profileId: z.string().optional(),
      tabId: z.number().optional(),
      code: z.string(),
    },
  },
};

export const toolNameToExtensionTool = {
  chromepilot_tabs_list: "tabs.list",
  chromepilot_tab_select: "tabs.select",
  chromepilot_navigate: "page.navigate",
  chromepilot_observe: "page.observe",
  chromepilot_click: "page.click",
  chromepilot_type: "page.type",
  chromepilot_press: "page.press",
  chromepilot_scroll: "page.scroll",
  chromepilot_screenshot: "page.screenshot",
  chromepilot_execute_js: "page.executeJs",
};

export function normalizeToolResult(result) {
  return {
    content: [
      {
        type: "text",
        text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  };
}
