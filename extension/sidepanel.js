const statusEl = document.querySelector("#status");
const profileIdEl = document.querySelector("#profileId");
const profileNameEl = document.querySelector("#profileName");
const controllerUrlEl = document.querySelector("#controllerUrl");
const controllerTokenEl = document.querySelector("#controllerToken");
const messagesEl = document.querySelector("#messages");
const taskEl = document.querySelector("#task");

document.querySelector("#refresh").addEventListener("click", refreshStatus);
document.querySelector("#save").addEventListener("click", saveProfile);
document.querySelector("#taskForm").addEventListener("submit", runTask);

refreshStatus();

async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({ type: "status" });
  if (!response.ok) {
    statusEl.textContent = response.error;
    return;
  }

  const { connected, controller, profile } = response.result;
  statusEl.textContent = connected ? "Controller connected" : "Controller offline";
  profileIdEl.value = profile.profileId || "";
  profileNameEl.value = profile.profileName || "";
  controllerUrlEl.value = controller;
}

async function saveProfile() {
  const response = await chrome.runtime.sendMessage({
    type: "save_profile",
    profileId: profileIdEl.value.trim(),
    profileName: profileNameEl.value.trim(),
    controllerUrl: controllerUrlEl.value.trim(),
    controllerToken: controllerTokenEl.value.trim(),
  });
  addMessage(response.ok ? "Saved. Reconnecting profile..." : response.error, "system");
  setTimeout(refreshStatus, 500);
}

async function runTask(event) {
  event.preventDefault();
  const task = taskEl.value.trim();
  if (!task) return;

  addMessage(task, "user");
  taskEl.value = "";
  addMessage("Running...", "system");

  const response = await chrome.runtime.sendMessage({
    type: "agent_run",
    task,
    profileId: profileIdEl.value.trim(),
  });

  if (!response.ok) {
    addMessage(response.error, "system");
    return;
  }

  const payload = response.result;
  addMessage(payload.result?.answer || JSON.stringify(payload, null, 2), "system");
}

function addMessage(text, role) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  messagesEl.append(node);
  node.scrollIntoView({ block: "end" });
}
