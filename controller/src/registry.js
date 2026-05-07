import crypto from "node:crypto";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export class ProfileRegistry {
  constructor(options = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.profiles = new Map();
    this.connectionToProfile = new Map();
    this.pending = new Map();
    this.sequence = 0;
  }

  register(profile) {
    const now = Date.now();
    const existing = this.profiles.get(profile.profileId) ?? {};
    const entry = {
      browser: profile.browser ?? existing.browser ?? "chrome",
      connectionId: profile.connectionId,
      connectedAt: existing.connectedAt ?? now,
      lastSeenAt: now,
      sequence: ++this.sequence,
      profileId: profile.profileId,
      profileName: profile.profileName ?? profile.profileId,
      send: profile.send ?? existing.send,
    };

    this.profiles.set(entry.profileId, entry);
    this.connectionToProfile.set(entry.connectionId, entry.profileId);
    return this.toPublicProfile(entry);
  }

  unregister(connectionId) {
    const profileId = this.connectionToProfile.get(connectionId);
    if (!profileId) return;
    this.connectionToProfile.delete(connectionId);
    this.profiles.delete(profileId);
  }

  listProfiles() {
    return [...this.profiles.values()].map((profile) =>
      this.toPublicProfile(profile),
    );
  }

  getActiveProfile() {
    const profiles = [...this.profiles.values()];
    if (profiles.length === 0) return null;
    profiles.sort((left, right) => right.lastSeenAt - left.lastSeenAt);
    profiles.sort((left, right) => right.sequence - left.sequence);
    return this.toPublicProfile(profiles[0]);
  }

  async request(profileId, tool, params = {}) {
    const targetProfileId = profileId || this.getActiveProfile()?.profileId;
    const profile = this.profiles.get(targetProfileId);
    if (!profile?.send) {
      throw new Error(`Profile not connected: ${targetProfileId}`);
    }

    const requestId = crypto.randomUUID();
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timed out waiting for ${tool} on ${targetProfileId}`));
      }, this.requestTimeoutMs);

      this.pending.set(requestId, { resolve, reject, timeout });
    });

    profile.send({
      type: "tool_request",
      requestId,
      tool,
      params,
    });

    return promise;
  }

  resolve(requestId, payload) {
    const pending = this.pending.get(requestId);
    if (!pending) return false;
    clearTimeout(pending.timeout);
    this.pending.delete(requestId);

    if (payload?.ok === false) {
      pending.reject(new Error(payload.error || "Browser tool failed"));
      return true;
    }

    pending.resolve(payload?.result);
    return true;
  }

  toPublicProfile(profile) {
    return {
      browser: profile.browser,
      connectedAt: profile.connectedAt,
      connectionId: profile.connectionId,
      lastSeenAt: profile.lastSeenAt,
      profileId: profile.profileId,
      profileName: profile.profileName,
    };
  }
}
