const oracleApp = window.GrainWatchApp;
const oracleData = oracleApp.data;

const commoditySelect = document.getElementById("oracleCommoditySelect");
const locationSelect = document.getElementById("oracleLocationSelect");
const actionSelect = document.getElementById("oracleActionSelect");
const quantityInput = document.getElementById("oracleQuantityInput");
const publishButton = document.getElementById("oraclePublishBtn");
const signatureStatus = document.getElementById("oracleSignatureStatus");

let oracleHistoryChart = null;
let activeSignedTicket = oracleApp.loadSignedBaseTicket();

function getDraftFromForm() {
  return {
    commodityKey: commoditySelect?.value || oracleData.commodities[0].key,
    location: locationSelect?.value || oracleData.locationDefaults.selectedLocation,
    quantityKg: Math.max(1, Number(quantityInput?.value || 1000)),
    side: actionSelect?.value || "WATCH"
  };
}

function renderChartForCommodity(key) {
  const commodity = oracleData.commodities.find((item) => item.key === key) || oracleData.commodities[0];
  const history = oracleData.history[key] || [];
  const minValue = Math.max(0, Math.floor(Math.min(...history) * 0.94));

  oracleHistoryChart?.destroy();
  oracleHistoryChart = new Chart(document.getElementById("oracleHistoryChart"), {
    type: "line",
    data: {
      labels: oracleData.labels30,
      datasets: [
        {
          label: commodity.name,
          data: history,
          borderColor: "#6557d2",
          backgroundColor: "rgba(101, 87, 210, 0.10)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      ...oracleApp.chartOptions(minValue),
      plugins: { legend: { display: false }, tooltip: oracleApp.chartOptions().plugins.tooltip }
    }
  });
}

function renderDraftPreview() {
  const ticket = oracleApp.buildBaseTicket(getDraftFromForm());
  const priceEl = document.getElementById("oracleTicketPrice");
  const notionalEl = document.getElementById("oracleTicketNotional");
  const expiryEl = document.getElementById("oracleTicketExpiry");

  if (priceEl) priceEl.textContent = oracleApp.formatPhp(ticket.unitPrice);
  if (notionalEl) notionalEl.textContent = oracleApp.formatPhp(ticket.notional);
  if (expiryEl) {
    expiryEl.textContent = new Date(ticket.value.expiryTimestamp * 1000).toLocaleTimeString("en-PH", { hour12: false });
  }

  if (publishButton) {
    publishButton.disabled = !oracleData.baseDesk.contractAddress;
    oracleApp.setControlLabel(publishButton, oracleData.baseDesk.contractAddress ? "Publish Intent" : "Contract Not Configured");
  }

  renderChartForCommodity(ticket.commodity.key);
}

function applyDraft(draft) {
  if (commoditySelect && draft?.commodityKey) commoditySelect.value = draft.commodityKey;
  if (locationSelect && draft?.location) locationSelect.value = draft.location;
  if (actionSelect && draft?.side) actionSelect.value = draft.side;
  if (quantityInput && draft?.quantityKg) quantityInput.value = String(draft.quantityKg);
}

async function signTicket() {
  try {
    const signedTicket = await oracleApp.signBaseTicket(getDraftFromForm());
    activeSignedTicket = signedTicket;
    if (signatureStatus) {
      signatureStatus.textContent = `Ticket signed by ${signedTicket.signedBy} with digest ${signedTicket.digest.slice(0, 14)}...`;
    }
    renderDraftPreview();
  } catch (error) {
    if (signatureStatus) signatureStatus.textContent = error.message || "Unable to sign the Base ticket.";
  }
}

async function publishTicket() {
  try {
    const ticket = activeSignedTicket || oracleApp.buildBaseTicket(getDraftFromForm());
    const publishedTicket = await oracleApp.publishBaseTicket(ticket);
    activeSignedTicket = publishedTicket;
    if (signatureStatus) {
      signatureStatus.textContent = `Transaction submitted: ${publishedTicket.transactionHash.slice(0, 14)}...`;
    }
    renderDraftPreview();
  } catch (error) {
    if (signatureStatus) signatureStatus.textContent = error.message || "Unable to publish the Base intent.";
  }
}

function exportTicket() {
  const payload = activeSignedTicket || oracleApp.buildBaseTicket(getDraftFromForm());
  oracleApp.exportJsonFile(payload, "grainwatch-base-ticket.json");
  oracleApp.updateFooterStatus(`Last update: Base ticket exported at ${new Date().toLocaleTimeString("en-PH", { hour12: false })}`);
}

const savedDraft = oracleApp.loadBaseDraft();
applyDraft(savedDraft || {
  commodityKey: oracleData.commodities[0].key,
  location: oracleData.locationDefaults.selectedLocation,
  quantityKg: 1000,
  side: "WATCH"
});

renderDraftPreview();

commoditySelect?.addEventListener("change", () => {
  activeSignedTicket = null;
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
locationSelect?.addEventListener("change", () => {
  activeSignedTicket = null;
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
actionSelect?.addEventListener("change", () => {
  activeSignedTicket = null;
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
quantityInput?.addEventListener("input", () => {
  activeSignedTicket = null;
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});

window.addEventListener("grainwatch:wallet-updated", renderDraftPreview);
document.getElementById("oracleSignBtn")?.addEventListener("click", signTicket);
document.getElementById("oraclePublishBtn")?.addEventListener("click", publishTicket);
document.getElementById("oracleExportBtn")?.addEventListener("click", exportTicket);
