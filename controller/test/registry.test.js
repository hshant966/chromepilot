import assert from "node:assert/strict";
import test from "node:test";

import { ProfileRegistry } from "../src/registry.js";

test("registers profiles and marks active profile by last heartbeat", () => {
  const registry = new ProfileRegistry();

  registry.register({
    connectionId: "conn-a",
    profileId: "Profile 7",
    profileName: "भारत",
    browser: "chrome",
  });
  registry.register({
    connectionId: "conn-b",
    profileId: "Profile 6",
    profileName: "Prashant",
    browser: "chrome",
  });

  assert.equal(registry.getActiveProfile().profileId, "Profile 6");
  assert.deepEqual(
    registry.listProfiles().map((profile) => profile.profileId),
    ["Profile 7", "Profile 6"],
  );
});

test("routes requests to selected profile connection", async () => {
  const registry = new ProfileRegistry({ requestTimeoutMs: 100 });
  const sent = [];

  registry.register({
    connectionId: "conn-a",
    profileId: "Profile 7",
    profileName: "भारत",
    browser: "chrome",
    send: (message) => sent.push(message),
  });

  const pending = registry.request("Profile 7", "tabs.list", {});
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "tool_request");
  assert.equal(sent[0].tool, "tabs.list");

  registry.resolve(sent[0].requestId, {
    ok: true,
    result: [{ id: 1, title: "New Tab" }],
  });

  assert.deepEqual(await pending, [{ id: 1, title: "New Tab" }]);
});

test("fails clearly when selected profile is not connected", async () => {
  const registry = new ProfileRegistry();

  await assert.rejects(
    registry.request("Missing", "tabs.list", {}),
    /Profile not connected: Missing/,
  );
});
