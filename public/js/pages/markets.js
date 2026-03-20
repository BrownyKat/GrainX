const marketsApp = window.GrainWatchApp;
const marketsData = marketsApp.data;
const marketPalette = ["#23d5ab", "#60a5fa", "#f59e0b", "#8b5cf6"];

const locationSelect = document.getElementById("locationSelect");
const plannerLocationSelect = document.getElementById("plannerLocationSelect");
const plannerGrainSelect = document.getElementById("plannerGrainSelect");
const plannerQuantityInput = document.getElementById("plannerQuantityInput");
const locationStatus = document.getElementById("locationStatus");
const locationCardGrid = document.getElementById("locationCardGrid");
const locationName = document.getElementById("locationName");
const locationMeta = document.getElementById("locationMeta");
const locationSource = document.getElementById("locationSource");
const plannerResult = document.getElementById("plannerResult");

let locationCatalog = [];
let currentLocationPayload = null;
let locationPricesChart = null;
let locationSpreadChart = null;

function currency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(value);
}

function getLocalFallbackLocation(name) {
  return (
    marketsData.locationMarkets.find((location) => location.location === name) ||
    marketsData.locationMarkets.find((location) => location.slug === name) ||
    marketsData.locationMarkets[0]
  );
}

function normalizeLocationPayload(payload) {
  if (payload.grains) return payload;

  const fallback = getLocalFallbackLocation(payload.location || marketsData.locationDefaults.selectedLocation);

  return {
    ok: true,
    mode: "pilot",
    location: fallback.location,
    region: fallback.region,
    source: fallback.source,
    updatedAt: fallback.updatedAt,
    logistics: fallback.logistics,
    grains: fallback.grains.map((grain) => {
      const national = marketsData.commodities.find((commodity) => commodity.key === grain.key);
      return {
        ...grain,
        nationalBenchmark: national?.value ?? null,
        threshold: marketsData.settings?.thresholds?.[grain.key] ?? null,
        status:
          typeof marketsData.settings?.thresholds?.[grain.key] === "number" && grain.price >= marketsData.settings.thresholds[grain.key]
            ? "Watch"
            : "Stable"
      };
    })
  };
}

const commoditySeries = marketsData.commodities.map((commodity, index) => ({
  ...commodity,
  color: marketPalette[index % marketPalette.length]
}));
const allValues = commoditySeries.flatMap((commodity) => marketsData.history[commodity.key] || []);
const marketMin = Math.max(0, Math.floor(Math.min(...allValues) * 0.92));

new Chart(document.getElementById("allCommoditiesChart"), {
  type: "line",
  data: {
    labels: marketsData.labels30,
    datasets: commoditySeries.map((commodity) => ({
      label: commodity.name,
      data: marketsData.history[commodity.key],
      borderColor: commodity.color,
      pointRadius: 0,
      tension: 0.35,
      borderWidth: 2
    }))
  },
  options: marketsApp.chartOptions(marketMin)
});

new Chart(document.getElementById("regionalPressureChart"), {
  type: "bar",
  data: {
    labels: marketsData.regions.map((region) => region.region),
    datasets: [
      {
        label: "Pressure",
        data: marketsData.regions.map((region) => region.intensity),
        backgroundColor: marketsData.regions.map((region) => {
          if (region.status === "Hot") return "rgba(239, 68, 68, 0.45)";
          if (region.status === "Warm") return "rgba(245, 158, 11, 0.45)";
          if (region.status === "Cold") return "rgba(96, 165, 250, 0.45)";
          return "rgba(35, 213, 171, 0.45)";
        }),
        borderColor: marketsData.regions.map((region) => {
          if (region.status === "Hot") return "#ef4444";
          if (region.status === "Warm") return "#f59e0b";
          if (region.status === "Cold") return "#60a5fa";
          return "#23d5ab";
        }),
        borderWidth: 1.5,
        borderRadius: 12
      }
    ]
  },
  options: {
    ...marketsApp.chartOptions(0),
    indexAxis: "y",
    plugins: { legend: { display: false } }
  }
});

function renderLocationCards(payload) {
  if (!locationCardGrid) return;

  locationCardGrid.innerHTML = payload.grains
    .map(
      (grain) => `
        <article class="location-card">
          <p class="location-card-title">${grain.name}</p>
          <p class="location-card-price">${grain.price.toFixed(1)} ${grain.unit}</p>
          <div class="location-card-meta">
            <span>${grain.variance >= 0 ? "+" : ""}${grain.variance.toFixed(1)} vs national</span>
            <span class="location-chip ${grain.status === "Watch" ? "is-watch" : "is-stable"}">${grain.status}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderLocationSummary(payload) {
  if (locationName) locationName.textContent = payload.location;
  if (locationMeta) {
    locationMeta.textContent = `${payload.region} | ${payload.logistics} | updated ${new Date(payload.updatedAt || Date.now()).toLocaleString("en-PH", { hour12: false })}`;
  }
  if (locationSource) {
    locationSource.textContent = payload.mode === "official+pilot" ? "Official + Pilot" : "Pilot Snapshot";
    locationSource.className = `heatmap-pill ${payload.mode === "official+pilot" ? "is-warm" : "is-cool"}`;
  }
}

function renderLocationCharts(payload) {
  const labels = payload.grains.map((grain) => grain.name);
  const prices = payload.grains.map((grain) => grain.price);
  const spreads = payload.grains.map((grain) => Number((grain.price - (grain.nationalBenchmark || 0)).toFixed(2)));
  const minPrice = Math.max(0, Math.floor(Math.min(...prices) * 0.9));

  locationPricesChart?.destroy();
  locationPricesChart = new Chart(document.getElementById("locationPricesChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: `${payload.location} price`,
          data: prices,
          backgroundColor: marketPalette.map((color) => `${color}55`),
          borderColor: marketPalette,
          borderWidth: 1.5,
          borderRadius: 12
        }
      ]
    },
    options: {
      ...marketsApp.chartOptions(minPrice),
      plugins: { legend: { display: false }, tooltip: marketsApp.chartOptions().plugins.tooltip }
    }
  });

  locationSpreadChart?.destroy();
  locationSpreadChart = new Chart(document.getElementById("locationSpreadChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Spread vs national",
          data: spreads,
          backgroundColor: spreads.map((spread) => (spread > 0 ? "rgba(239, 68, 68, 0.40)" : "rgba(35, 213, 171, 0.35)")),
          borderColor: spreads.map((spread) => (spread > 0 ? "#ef4444" : "#23d5ab")),
          borderWidth: 1.5,
          borderRadius: 12
        }
      ]
    },
    options: {
      ...marketsApp.chartOptions(-2),
      plugins: { legend: { display: false }, tooltip: marketsApp.chartOptions().plugins.tooltip }
    }
  });
}

function populatePlannerGrains(payload) {
  if (!plannerGrainSelect) return;

  plannerGrainSelect.innerHTML = payload.grains
    .map((grain) => `<option value="${grain.key}">${grain.name}</option>`)
    .join("");
}

function updatePlanner() {
  if (!currentLocationPayload || !plannerResult) return;

  const selectedGrain = currentLocationPayload.grains.find((grain) => grain.key === plannerGrainSelect?.value) || currentLocationPayload.grains[0];
  const quantity = Math.max(1, Number(plannerQuantityInput?.value || 1));
  const total = selectedGrain.price * quantity;
  const benchmarkTotal = (selectedGrain.nationalBenchmark || selectedGrain.price) * quantity;
  const spread = total - benchmarkTotal;

  plannerResult.innerHTML = `
    <div class="planner-result-grid">
      <article class="planner-result-card">
        <p class="planner-result-label">Estimated Cost</p>
        <p class="planner-result-value">${currency(total)}</p>
        <p class="planner-result-copy">${quantity.toLocaleString("en-PH")} kg of ${selectedGrain.name} in ${currentLocationPayload.location}.</p>
      </article>
      <article class="planner-result-card">
        <p class="planner-result-label">National Benchmark</p>
        <p class="planner-result-value">${currency(benchmarkTotal)}</p>
        <p class="planner-result-copy">Compared against the current national benchmark used on the dashboard.</p>
      </article>
      <article class="planner-result-card">
        <p class="planner-result-label">Location Spread</p>
        <p class="planner-result-value ${spread > 0 ? "tone-danger" : "tone-neon"}">${spread >= 0 ? "+" : ""}${currency(spread)}</p>
        <p class="planner-result-copy">${spread > 0 ? "Higher than national benchmark. Consider another city or wait for replenishment." : "Lower than national benchmark. This city is currently more attractive for procurement."}</p>
      </article>
    </div>
  `;
}

function syncLocationSelectors(value) {
  if (locationSelect) locationSelect.value = value;
  if (plannerLocationSelect) plannerLocationSelect.value = value;
}

function populateLocationSelects(locations, defaultLocation) {
  locationCatalog = locations;
  const options = locations
    .map((location) => `<option value="${location.location}">${location.location}</option>`)
    .join("");

  if (locationSelect) locationSelect.innerHTML = options;
  if (plannerLocationSelect) plannerLocationSelect.innerHTML = options;
  syncLocationSelectors(defaultLocation);
}

async function fetchLocationPrices(location) {
  if (locationStatus) locationStatus.textContent = `Fetching ${location}...`;

  try {
    const response = await fetch(`/api/v1/location-prices?location=${encodeURIComponent(location)}`);
    if (!response.ok) throw new Error("Location fetch failed");
    const payload = normalizeLocationPayload(await response.json());
    currentLocationPayload = payload;
    syncLocationSelectors(payload.location);
    renderLocationSummary(payload);
    renderLocationCards(payload);
    renderLocationCharts(payload);
    populatePlannerGrains(payload);
    updatePlanner();
    if (locationStatus) {
      locationStatus.textContent =
        payload.mode === "official+pilot"
          ? `Loaded ${payload.location} with official mapping and pilot prices.`
          : `Loaded ${payload.location} pilot prices successfully.`;
    }
    marketsApp.updateFooterStatus(`Last update: loaded ${payload.location} grain prices`);
  } catch (_error) {
    const fallback = normalizeLocationPayload(getLocalFallbackLocation(location));
    currentLocationPayload = fallback;
    syncLocationSelectors(fallback.location);
    renderLocationSummary(fallback);
    renderLocationCards(fallback);
    renderLocationCharts(fallback);
    populatePlannerGrains(fallback);
    updatePlanner();
    if (locationStatus) locationStatus.textContent = `Loaded fallback pilot prices for ${fallback.location}.`;
    marketsApp.updateFooterStatus(`Last update: loaded fallback prices for ${fallback.location}`);
  }
}

async function initializeLocationExplorer() {
  try {
    const response = await fetch("/api/v1/locations");
    if (!response.ok) throw new Error("Could not load locations");
    const payload = await response.json();
    locationCatalog = payload.locations;
    populateLocationSelects(payload.locations, payload.defaultLocation || marketsData.locationDefaults.selectedLocation);
  } catch (_error) {
    locationCatalog = marketsData.locationMarkets.map((location) => ({
      location: location.location,
      region: location.region
    }));
    populateLocationSelects(locationCatalog, marketsData.locationDefaults.selectedLocation);
  }

  await fetchLocationPrices((locationSelect && locationSelect.value) || marketsData.locationDefaults.selectedLocation);
}

document.getElementById("locationRefreshBtn")?.addEventListener("click", () => {
  fetchLocationPrices((locationSelect && locationSelect.value) || marketsData.locationDefaults.selectedLocation);
});

locationSelect?.addEventListener("change", (event) => {
  fetchLocationPrices(event.target.value);
});

plannerLocationSelect?.addEventListener("change", (event) => {
  fetchLocationPrices(event.target.value);
});

plannerGrainSelect?.addEventListener("change", updatePlanner);
plannerQuantityInput?.addEventListener("input", updatePlanner);

document.getElementById("openBaseDeskFromMarketsBtn")?.addEventListener("click", () => {
  const selectedLocation = (plannerLocationSelect && plannerLocationSelect.value) || marketsData.locationDefaults.selectedLocation;
  const selectedGrainKey = plannerGrainSelect?.value || currentLocationPayload?.grains?.[0]?.key || marketsData.commodities[0]?.key;

  marketsApp.saveBaseDraft({
    commodityKey: selectedGrainKey,
    location: selectedLocation,
    quantityKg: Math.max(1, Number(plannerQuantityInput?.value || 1000)),
    side: "BUY"
  });

  window.location.href = "/oracle";
});

initializeLocationExplorer();
