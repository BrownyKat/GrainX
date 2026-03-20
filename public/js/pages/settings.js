const settingsApp = window.GrainWatchApp;

const thresholdInputs = document.querySelectorAll("[data-threshold]");
const toggles = document.querySelectorAll("[data-toggle-index]");

function loadSavedSettings() {
  try {
    const savedThresholds = JSON.parse(localStorage.getItem("grainwatch-thresholds") || "null");
    if (savedThresholds) {
      thresholdInputs.forEach((input) => {
        const key = input.dataset.threshold;
        if (typeof savedThresholds[key] === "number") {
          input.value = savedThresholds[key];
        }
      });
    }

    const savedToggles = JSON.parse(localStorage.getItem("grainwatch-notifications") || "null");
    if (Array.isArray(savedToggles)) {
      toggles.forEach((toggle) => {
        const index = Number(toggle.dataset.toggleIndex);
        const enabled = Boolean(savedToggles[index]);
        toggle.classList.toggle("is-on", enabled);
      });
    }
  } catch (_error) {
    settingsApp.updateFooterStatus("Last update: unable to restore saved settings");
  }
}

function saveSettings() {
  const thresholds = {};
  thresholdInputs.forEach((input) => {
    thresholds[input.dataset.threshold] = Number(input.value);
  });
  localStorage.setItem("grainwatch-thresholds", JSON.stringify(thresholds));
  localStorage.setItem(
    "grainwatch-notifications",
    JSON.stringify(
      Array.from(toggles).map((toggle) => toggle.classList.contains("is-on"))
    )
  );
  settingsApp.updateFooterStatus(`Last update: settings saved at ${new Date().toLocaleTimeString("en-US", { hour12: false })}`);
}

toggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("is-on");
  });
});

document.getElementById("settingsSaveBtn")?.addEventListener("click", saveSettings);
loadSavedSettings();
