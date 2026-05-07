const DEFAULT_CONTROLLER = "http://127.0.0.1:4777";

let socket = null;
let reconnectTimer = null;
const refsByTab = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-side-panel") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleRuntimeMessage(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

connect();

async function handleRuntimeMessage(message) {
  if (message?.type === "status") {
    return {
      connected: socket?.readyState === WebSocket.OPEN,
      controller: await getControllerUrl(),
      profile: await getProfileInfo(),
    };
  }

  if (message?.type === "save_profile") {
    await chrome.storage.local.set({
      profileId: message.profileId,
      profileName: message.profileName,
      controllerUrl: message.controllerUrl || DEFAULT_CONTROLLER,
      controllerToken: message.controllerToken || "",
    });
    reconnect();
    return { saved: true };
  }

  if (message?.type === "agent_run") {
    const controller = await getControllerUrl();
    const response = await fetch(`${controller}/api/agent/run`, {
      method: "POST",
      headers: await jsonHeaders(),
      body: JSON.stringify(message),
    });
    return response.json();
  }

  if (message?.type === "tool") {
    return executeTool(message.tool, message.params || {});
  }

  throw new Error(`Unknown message type: ${message?.type}`);
}

async function connect() {
  clearTimeout(reconnectTimer);
  const controller = await getControllerUrl();
  const token = await getControllerToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
  const wsUrl = controller.replace(/^http/, "ws") + `/extension${tokenQuery}`;

  try {
    socket = new WebSocket(wsUrl);
    socket.addEventListener("open", registerProfile);
    socket.addEventListener("message", handleSocketMessage);
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", scheduleReconnect);
  } catch {
    scheduleReconnect();
  }
}

function reconnect() {
  if (socket) socket.close();
  connect();
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 1500);
}

async function registerProfile() {
  const profile = await getProfileInfo();
  socket.send(JSON.stringify({ type: "profile_register", browser: "chrome", ...profile }));
}

async function handleSocketMessage(event) {
  const message = JSON.parse(event.data);
  if (message.type !== "tool_request") return;

  try {
    const result = await executeTool(message.tool, message.params || {});
    socket.send(JSON.stringify({ type: "tool_response", requestId: message.requestId, ok: true, result }));
  } catch (error) {
    socket.send(JSON.stringify({ type: "tool_response", requestId: message.requestId, ok: false, error: error.message }));
  }
}

async function getControllerUrl() {
  const stored = await chrome.storage.local.get(["controllerUrl"]);
  return stored.controllerUrl || DEFAULT_CONTROLLER;
}

async function getControllerToken() {
  const stored = await chrome.storage.local.get(["controllerToken"]);
  return stored.controllerToken || "";
}

async function jsonHeaders() {
  const token = await getControllerToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function getProfileInfo() {
  const stored = await chrome.storage.local.get(["profileId", "profileName"]);
  let userInfo = {};
  try {
    userInfo = await chrome.identity.getProfileUserInfo({ accountStatus: "ANY" });
  } catch {
    userInfo = {};
  }
  const email = userInfo.email || "";
  const id = userInfo.id || chrome.runtime.id;
  return {
    profileId: stored.profileId || email || id,
    profileName: stored.profileName || email || "Chrome profile",
  };
}

async function executeTool(tool, params) {
  switch (tool) {
    case "tabs.list":
      return tabsList();
    case "tabs.select":
      return tabSelect(params);
    case "page.navigate":
      return pageNavigate(params);
    case "page.observe":
      return pageObserve(params);
    case "page.click":
      return pageClick(params);
    case "page.type":
      return pageType(params);
    case "page.press":
      return pagePress(params);
    case "page.scroll":
      return pageScroll(params);
    case "page.screenshot":
      return pageScreenshot(params);
    case "page.executeJs":
      return pageExecuteJs(params);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

async function tabsList() {
  const tabs = await chrome.tabs.query({});
  return tabs.map((tab) => ({
    active: tab.active,
    id: tab.id,
    index: tab.index,
    title: tab.title,
    url: tab.url,
    windowId: tab.windowId,
  }));
}

async function tabSelect({ tabId }) {
  if (!tabId) throw new Error("tabId is required");
  const tab = await chrome.tabs.update(tabId, { active: true });
  if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  return { selected: tab.id, title: tab.title, url: tab.url };
}

async function pageNavigate({ tabId, url }) {
  if (!url) throw new Error("url is required");
  const targetTabId = tabId || (await getActiveTab()).id;
  const tab = await chrome.tabs.update(targetTabId, { url });
  return waitForTabComplete(tab.id);
}

async function pageObserve({ tabId, maxItems = 120 }) {
  const targetTabId = tabId || (await getActiveTab()).id;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: observePage,
    args: [maxItems],
  });
  refsByTab.set(targetTabId, result.refs);
  return result.snapshot;
}

async function pageClick({ tabId, ref }) {
  const targetTabId = tabId || (await getActiveTab()).id;
  const selector = getSelector(targetTabId, ref);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: clickSelector,
    args: [selector],
  });
  return result;
}

async function pageType({ tabId, ref, text, clear = true }) {
  const targetTabId = tabId || (await getActiveTab()).id;
  const selector = getSelector(targetTabId, ref);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: typeSelector,
    args: [selector, text, clear],
  });
  return result;
}

async function pagePress({ tabId, key }) {
  const targetTabId = tabId || (await getActiveTab()).id;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: pressKey,
    args: [key],
  });
  return result;
}

async function pageScroll({ tabId, direction = "down", amount = 800 }) {
  const targetTabId = tabId || (await getActiveTab()).id;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: scrollPage,
    args: [direction, amount],
  });
  return result;
}

async function pageScreenshot({ tabId }) {
  const tab = tabId ? await chrome.tabs.get(tabId) : await getActiveTab();
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return { tabId: tab.id, dataUrl };
}

async function pageExecuteJs({ tabId, code }) {
  const stored = await chrome.storage.local.get(["allowDangerousJs"]);
  if (!stored.allowDangerousJs) {
    throw new Error("page.executeJs is disabled in the extension. Enable allowDangerousJs only for trusted local debugging.");
  }
  const targetTabId = tabId || (await getActiveTab()).id;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: (source) => globalThis.eval(source),
    args: [code],
  });
  return { result };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");
  return tab;
}

async function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timer = setTimeout(async () => resolve(await chrome.tabs.get(tabId)), 12_000);
    const listener = async (changedTabId, changeInfo) => {
      if (changedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        const tab = await chrome.tabs.get(tabId);
        resolve({ id: tab.id, title: tab.title, url: tab.url });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function getSelector(tabId, ref) {
  const refs = refsByTab.get(tabId);
  if (!refs?.[ref]) throw new Error(`Unknown ref ${ref}. Run page.observe first.`);
  return refs[ref];
}

function observePage(maxItems) {
  const candidates = [...document.querySelectorAll("a,button,input,textarea,select,[role=button],[role=link],[contenteditable=true]")];
  const refs = {};
  const items = [];
  let index = 1;

  for (const element of candidates) {
    if (items.length >= maxItems) break;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (rect.width < 2 || rect.height < 2 || style.visibility === "hidden" || style.display === "none") continue;

    const ref = `@${index++}`;
    refs[ref] = stableSelector(element);
    items.push({
      ref,
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      text: compactText(element.innerText || element.getAttribute("aria-label") || element.getAttribute("placeholder") || ""),
      href: element.href || "",
      type: element.getAttribute("type") || "",
      sensitive: isSensitiveElement(element),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
    });
  }

  return {
    refs,
    snapshot: {
      title: document.title,
      url: location.href,
      scroll: { x: scrollX, y: scrollY, height: document.documentElement.scrollHeight },
      items,
    },
  };

  function stableSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const testId = element.getAttribute("data-testid") || element.getAttribute("data-test");
    if (testId) return `[data-testid="${cssAttr(testId)}"],[data-test="${cssAttr(testId)}"]`;
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      let part = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((child) => child.tagName === current.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(" > ");
  }

  function compactText(text) {
    return String(text).replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function isSensitiveElement(element) {
    const type = String(element.getAttribute("type") || "").toLowerCase();
    const autocomplete = String(element.getAttribute("autocomplete") || "").toLowerCase();
    return type === "password" || autocomplete.includes("one-time-code") || autocomplete.includes("cc-");
  }

  function cssAttr(value) {
    return String(value).replaceAll('"', '\\"');
  }
}

function clickSelector(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  element.scrollIntoView({ block: "center", inline: "center" });
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  element.click();
  return { clicked: true, selector, title: document.title, url: location.href };
}

function typeSelector(selector, text, clear) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  const type = String(element.getAttribute("type") || "").toLowerCase();
  const autocomplete = String(element.getAttribute("autocomplete") || "").toLowerCase();
  if (type === "password" || autocomplete.includes("one-time-code") || autocomplete.includes("cc-")) {
    throw new Error("Refusing to type into password, OTP, or payment fields.");
  }
  element.scrollIntoView({ block: "center", inline: "center" });
  element.focus();
  if (clear) element.value = "";
  element.value = `${element.value || ""}${text}`;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return { typed: true, selector, textLength: text.length };
}

function pressKey(key) {
  const normalized = String(key || "");
  const eventInit = { key: normalized, code: normalized, bubbles: true, cancelable: true };
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  document.activeElement?.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  if (normalized === "Enter") document.activeElement?.dispatchEvent(new Event("change", { bubbles: true }));
  return { pressed: normalized };
}

function scrollPage(direction, amount) {
  const x = direction === "left" ? -amount : direction === "right" ? amount : 0;
  const y = direction === "up" ? -amount : direction === "down" ? amount : 0;
  scrollBy({ left: x, top: y, behavior: "smooth" });
  return { x: scrollX + x, y: scrollY + y };
}
