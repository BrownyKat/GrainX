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
  const allValues = [...history, commodity.threshold || 0];
  const minValue = Math.max(0, Math.floor(Math.min(...allValues) * 0.94));

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
        },
        {
          label: "Watch Threshold",
          data: new Array(history.length).fill(commodity.threshold),
          borderColor: "#ef4444",
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
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
  const preview = document.getElementById("oracleReceiptPreview");
  const priceEl = document.getElementById("oracleTicketPrice");
  const notionalEl = document.getElementById("oracleTicketNotional");
  const expiryEl = document.getElementById("oracleTicketExpiry");

  if (priceEl) priceEl.textContent = oracleApp.formatPhp(ticket.unitPrice);
  if (notionalEl) notionalEl.textContent = oracleApp.formatPhp(ticket.notional);
  if (expiryEl) {
    expiryEl.textContent = new Date(ticket.value.expiryTimestamp * 1000).toLocaleTimeString("en-PH", { hour12: false });
  }

  if (preview) {
    const isSigned = activeSignedTicket && activeSignedTicket.digest === ticket.digest;
    const digestDisplay = ticket.digest.slice(0, 10) + "..." + ticket.digest.slice(-8);
    const statusColor = isSigned ? "text-emerald-400" : "text-amber-400";
    const statusBg = isSigned ? "bg-emerald-400/10" : "bg-amber-400/10";
    const statusLabel = isSigned ? "Signed & Ready" : "Draft Pending";

    preview.style.whiteSpace = "normal";
    preview.innerHTML = `
      <div class="rounded-lg border border-slate-700/50 bg-slate-800/40 p-5">
        <div class="flex items-center justify-between border-b border-slate-700/50 pb-3 mb-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Base Attestation Ticket</span>
          <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusBg} ${statusColor}">${statusLabel}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          <div><p class="text-xs text-slate-500 uppercase">Commodity</p><p class="font-medium text-slate-200 mt-0.5">${ticket.commodity.name}</p></div>
          <div><p class="text-xs text-slate-500 uppercase">Location</p><p class="font-medium text-slate-200 mt-0.5">${ticket.location.location}</p></div>
          <div><p class="text-xs text-slate-500 uppercase">Quantity</p><p class="font-medium text-slate-200 mt-0.5">${ticket.draft.quantityKg.toLocaleString()} kg <span class="text-slate-500 text-xs">(${ticket.draft.side})</span></p></div>
          <div><p class="text-xs text-slate-500 uppercase">Total Value</p><p class="font-medium text-slate-200 mt-0.5">${oracleApp.formatPhp(ticket.notional)}</p></div>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-700/50">
           <div class="flex justify-between items-center">
             <div>
                <p class="text-xs text-slate-500 uppercase">Digest</p>
                <p class="font-mono text-xs text-slate-400 mt-0.5">${digestDisplay}</p>
             </div>
              <div>
                <p class="text-xs text-slate-500 uppercase text-right">Network</p>
                <p class="text-xs text-slate-300 mt-0.5 text-right">${oracleData.baseDesk.preferredChain}</p>
             </div>
           </div>
        </div>
      </div>`;
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
  if (signatureStatus) signatureStatus.textContent = "Draft modified. Please resign.";
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
locationSelect?.addEventListener("change", () => {
  activeSignedTicket = null;
  if (signatureStatus) signatureStatus.textContent = "Draft modified. Please resign.";
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
actionSelect?.addEventListener("change", () => {
  activeSignedTicket = null;
  if (signatureStatus) signatureStatus.textContent = "Draft modified. Please resign.";
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});
quantityInput?.addEventListener("input", () => {
  activeSignedTicket = null;
  if (signatureStatus) signatureStatus.textContent = "Draft modified. Please resign.";
  oracleApp.saveBaseDraft(getDraftFromForm());
  renderDraftPreview();
});

window.addEventListener("grainwatch:wallet-updated", renderDraftPreview);
document.getElementById("oracleSignBtn")?.addEventListener("click", signTicket);
document.getElementById("oraclePublishBtn")?.addEventListener("click", publishTicket);
document.getElementById("oracleExportBtn")?.addEventListener("click", exportTicket);
