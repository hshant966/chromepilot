#!/usr/bin/env node
import http from "node:http";

import express from "express";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { runAgentTask } from "./agent.js";
import {
  browserToolSchemas,
  normalizeToolResult,
  toolNameToExtensionTool,
} from "./browserTools.js";
import { ProfileRegistry } from "./registry.js";

const PORT = Number(process.env.CHROMEPILOT_PORT || 4777);
const AUTH_TOKEN = process.env.CHROMEPILOT_TOKEN || "";
const registry = new ProfileRegistry();

function createHttpServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use((req, res, next) => {
    if (!AUTH_TOKEN || req.path === "/health") return next();
    const header = req.get("authorization") || "";
    if (header === `Bearer ${AUTH_TOKEN}`) return next();
    return res.status(401).json({ ok: false, error: "ChromePilot token required" });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chromepilot", profiles: registry.listProfiles().length });
  });

  app.get("/api/profiles", (_req, res) => {
    res.json({ profiles: registry.listProfiles(), activeProfile: registry.getActiveProfile() });
  });

  app.post("/api/tool/:tool", async (req, res) => {
    try {
      const tool = req.params.tool;
      const { profileId, ...params } = req.body || {};
      const result = await callBrowserTool(tool, { profileId, ...params });
      res.json({ ok: true, result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/agent/run", async (req, res) => {
    try {
      const { task, profileId, maxSteps } = req.body || {};
      if (!task) throw new Error("task is required");
      const result = await runAgentTask({ task, registry, profileId, maxSteps });
      res.json({ ok: true, result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  const server = http.createServer(app);
  attachWebSocketServer(server);
  return server;
}

function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: "/extension" });

  wss.on("connection", (socket, request) => {
    if (AUTH_TOKEN) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.searchParams.get("token") !== AUTH_TOKEN) {
        socket.close(1008, "ChromePilot token required");
        return;
      }
    }

    const connectionId = cryptoRandomId();

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.type === "profile_register") {
          registry.register({
            connectionId,
            profileId: message.profileId,
            profileName: message.profileName,
            browser: message.browser,
            send: (payload) => socket.send(JSON.stringify(payload)),
          });
          socket.send(JSON.stringify({ type: "registered", connectionId }));
          return;
        }

        if (message.type === "tool_response") {
          registry.resolve(message.requestId, message);
        }
      } catch (error) {
        socket.send(JSON.stringify({ type: "error", error: error.message }));
      }
    });

    socket.on("close", () => registry.unregister(connectionId));
  });
}

async function callBrowserTool(mcpToolName, args = {}) {
  if (mcpToolName === "chromepilot_profiles_list") {
    return {
      profiles: registry.listProfiles(),
      activeProfile: registry.getActiveProfile(),
    };
  }

  if (mcpToolName === "chromepilot_execute_js" && process.env.CHROMEPILOT_ALLOW_EXECUTE_JS !== "true") {
    throw new Error("chromepilot_execute_js is disabled. Set CHROMEPILOT_ALLOW_EXECUTE_JS=true only for trusted local sessions.");
  }

  const extensionTool = toolNameToExtensionTool[mcpToolName] || mcpToolName;
  const { profileId, ...params } = args;
  return registry.request(profileId, extensionTool, params);
}

function createMcpServer() {
  const mcpServer = new McpServer({
    name: "chromepilot",
    version: "0.1.0",
  });

  for (const [name, config] of Object.entries(browserToolSchemas)) {
    mcpServer.registerTool(
      name,
      {
        description: config.description,
        inputSchema: config.inputSchema,
        annotations: {
          readOnlyHint: Boolean(config.readOnlyHint),
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      async (args) => normalizeToolResult(await callBrowserTool(name, args)),
    );
  }

  return mcpServer;
}

async function main() {
  const httpServer = createHttpServer();
  httpServer.listen(PORT, "127.0.0.1", () => {
    console.error(`ChromePilot controller listening on http://127.0.0.1:${PORT}`);
  });

  if (process.argv.includes("--mcp")) {
    const mcpServer = createMcpServer();
    await mcpServer.connect(new StdioServerTransport());
  }
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
