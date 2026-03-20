const dashboardApp = window.GrainWatchApp;
const dashboardData = dashboardApp.data;

const quoteRows = Array.from(document.querySelectorAll(".dashboard-quote-row"));
const commodityMap = new Map(dashboardData.commodities.map((commodity) => [commodity.key, commodity]));
const rowMap = new Map(dashboardData.marketRows.map((row) => [row.key, row]));

let selectedKey = dashboardData.marketRows[0]?.key || dashboardData.commodities[0]?.key;
let selectedCommodityChart = null;
let selectedLocationChart = null;

function numberFormat(value) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function getLocationSeries(key) {
  return dashboardData.locationMarkets.map((location) => {
    const grain = location.grains.find((item) => item.key === key);
    return {
      location: location.location,
      price: grain?.price ?? 0
    };
  });
}

function renderDetail(key) {
  const commodity = commodityMap.get(key);
  const boardRow = rowMap.get(key);
  const locationSeries = getLocationSeries(key);
  const leadLocation = locationSeries.reduce((best, current) => (current.price > best.price ? current : best), locationSeries[0]);
  const locationSpread = Number((leadLocation.price - commodity.value).toFixed(2));

  document.getElementById("selectedCommodityName").textContent = commodity.name;
  document.getElementById("selectedCommoditySignal").textContent = commodity.signal;
  document.getElementById("selectedCommoditySymbol").textContent = commodity.symbol;
  document.getElementById("selectedCommodityPrice").textContent = numberFormat(commodity.value);
  document.getElementById("selectedCommodityBenchmark").textContent = commodity.benchmark;
  document.getElementById("selectedCommodityThreshold").textContent = numberFormat(commodity.threshold);
  document.getElementById("selectedCommodityMonthly").textContent = `${commodity.monthlyChange}%`;
  document.getElementById("selectedCommodityConfidence").textContent = `${commodity.confidence}%`;
  document.getElementById("selectedCommodityLeadCity").textContent = boardRow?.leadLocation || leadLocation.location;

  const spreadEl = document.getElementById("selectedCommodityLeadSpread");
  spreadEl.textContent = `${locationSpread >= 0 ? "+" : ""}${numberFormat(locationSpread)} PHP/kg`;
  spreadEl.className = `dashboard-detail-spread ${locationSpread > 0 ? "tone-danger" : "tone-neon"}`;

  quoteRows.forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.key === key);
  });
}

function renderCharts(key) {
  const commodity = commodityMap.get(key);
  const series = dashboardData.history[key] || [];
  const citySeries = getLocationSeries(key);
  const minTrend = Math.max(0, Math.floor(Math.min(...series) * 0.94));
  const minCity = Math.max(0, Math.floor(Math.min(...citySeries.map((entry) => entry.price)) * 0.94));

  selectedCommodityChart?.destroy();
  selectedCommodityChart = new Chart(document.getElementById("selectedCommodityChart"), {
    type: "line",
    data: {
      labels: dashboardData.labels30,
      datasets: [
        {
          label: commodity.name,
          data: series,
          borderColor: "#2f6fed",
          backgroundColor: "rgba(47, 111, 237, 0.10)",
          fill: true,
          tension: 0.32,
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: dashboardApp.chartOptions(minTrend)
  });

  selectedLocationChart?.destroy();
  selectedLocationChart = new Chart(document.getElementById("selectedLocationChart"), {
    type: "bar",
    data: {
      labels: citySeries.map((entry) => entry.location),
      datasets: [
        {
          label: `${commodity.symbol} price`,
          data: citySeries.map((entry) => entry.price),
          backgroundColor: citySeries.map((entry) =>
            entry.price >= commodity.value ? "rgba(209, 67, 67, 0.20)" : "rgba(15, 159, 110, 0.18)"
          ),
          borderColor: citySeries.map((entry) => (entry.price >= commodity.value ? "#d14343" : "#0f9f6e")),
          borderWidth: 1.5,
          borderRadius: 12
        }
      ]
    },
    options: {
      ...dashboardApp.chartOptions(minCity),
      plugins: { legend: { display: false }, tooltip: dashboardApp.chartOptions().plugins.tooltip }
    }
  });
}

function selectCommodity(key) {
  selectedKey = key;
  renderDetail(key);
  renderCharts(key);
}

quoteRows.forEach((row) => {
  row.addEventListener("click", () => selectCommodity(row.dataset.key));
});

document.getElementById("dashboardRefreshBtn")?.addEventListener("click", () => {
  renderCharts(selectedKey);
  dashboardApp.updateFooterStatus(
    `Last update: grain board refreshed at ${new Date().toLocaleTimeString("en-PH", { hour12: false })}`
  );
});

document.getElementById("openBaseDeskBtn")?.addEventListener("click", () => {
  const draft = {
    commodityKey: selectedKey,
    location: rowMap.get(selectedKey)?.leadLocation || dashboardData.locationDefaults.selectedLocation,
    quantityKg: 1000,
    side: "WATCH"
  };
  dashboardApp.saveBaseDraft(draft);
  window.location.href = "/oracle";
});

selectCommodity(selectedKey);
