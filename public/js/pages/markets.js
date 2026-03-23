const marketsApp = window.GrainWatchApp;
const marketsData = marketsApp.data;
const marketPalette = ["#23d5ab", "#60a5fa", "#f59e0b", "#8b5cf6"];

const locationRegionSelect = document.getElementById("locationRegionSelect");
const locationProvinceSelect = document.getElementById("locationProvinceSelect");
const locationSelect = document.getElementById("locationSelect");
const plannerGrainSelect = document.getElementById("plannerGrainSelect");
const plannerQuantityInput = document.getElementById("plannerQuantityInput");
const locationStatus = document.getElementById("locationStatus");
const locationCardGrid = document.getElementById("locationCardGrid");
const locationName = document.getElementById("locationName");
const locationMeta = document.getElementById("locationMeta");
const locationSource = document.getElementById("locationSource");
const locationRegionValue = document.getElementById("locationRegionValue");
const locationProvinceValue = document.getElementById("locationProvinceValue");
const locationBasketValue = document.getElementById("locationBasketValue");
const plannerLocationName = document.getElementById("plannerLocationName");
const plannerLocationMeta = document.getElementById("plannerLocationMeta");
const plannerResult = document.getElementById("plannerResult");
const exchangeOverview = document.getElementById("exchangeOverview");
const exchangeHoldings = document.getElementById("exchangeHoldings");
const exchangeTrades = document.getElementById("exchangeTrades");
const exchangeStatus = document.getElementById("exchangeStatus");
const exchangeModePill = document.getElementById("exchangeModePill");
const walletBuyBtn = document.getElementById("walletBuyBtn");
const walletSellBtn = document.getElementById("walletSellBtn");

let locationCatalog = [];
let locationTaxonomy = [];
let currentLocationPayload = null;
let locationPricesChart = null;
let locationSpreadChart = null;
let locationFetchController = null;
const locationSelectorGroup = {
  regionSelect: locationRegionSelect,
  provinceSelect: locationProvinceSelect,
  citySelect: locationSelect
};
const exchangeState = {
  snapshot: null,
  portfolio: null
};
const paperPortfolioStoragePrefix = "grainwatch-wallet-paper";
const maxTradeHistory = 8;

function currency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(value);
}

function currencyAxis(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value);
}

function formatEth(value, maximumFractionDigits = 6) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value)} ETH`;
}

function formatDateTime(value) {
  return new Date(value || Date.now()).toLocaleString("en-PH", { hour12: false });
}

function formatSignedNumber(value, maximumFractionDigits = 1) {
  const absolute = Math.abs(Number(value || 0)).toFixed(maximumFractionDigits);
  return `${Number(value || 0) >= 0 ? "+" : "-"}${absolute}`;
}

function formatSignedCurrency(value, maximumFractionDigits = 2) {
  const absolute = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits
  }).format(Math.abs(Number(value || 0)));

  return `${Number(value || 0) >= 0 ? "+" : "-"}${absolute}`;
}

function wrapChartLabel(label, maxCharacters = 14) {
  const words = String(label || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxCharacters || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [label];
}

function getLocationModeMeta(payload) {
  if (payload.mode === "official+pilot") {
    return {
      sourceLabel: "Official + Pilot",
      sourceClassName: "heatmap-pill is-warm",
      plannerCopy: "Planning uses the selected location with official mapping plus pilot pricing."
    };
  }

  if (payload.mode === "official") {
    return {
      sourceLabel: "Official Snapshot",
      sourceClassName: "heatmap-pill is-cold",
      plannerCopy: `Planning uses the official ${payload.officialGeolocation || payload.location} market reference for this location.`
    };
  }

  if (payload.mode === "national-fallback") {
    return {
      sourceLabel: "National Fallback",
      sourceClassName: "heatmap-pill is-cold",
      plannerCopy: "Planning uses the national benchmark fallback until a dedicated local quote is available."
    };
  }

  return {
    sourceLabel: "Pilot Snapshot",
    sourceClassName: "heatmap-pill is-cool",
    plannerCopy: "Planning follows the selected pilot market automatically."
  };
}

function getSpreadToneClass(spread) {
  if (spread > 0.05) return "tone-danger";
  if (spread < -0.05) return "tone-neon";
  return "tone-info";
}

function getAverageBasketDelta(grains = []) {
  const comparableGrains = grains.filter((grain) => Number.isFinite(Number(grain.nationalBenchmark)));
  if (!comparableGrains.length) return null;

  const averageLocal = comparableGrains.reduce((total, grain) => total + Number(grain.price || 0), 0) / comparableGrains.length;
  const averageBenchmark =
    comparableGrains.reduce((total, grain) => total + Number(grain.nationalBenchmark || 0), 0) / comparableGrains.length;

  return Number((averageLocal - averageBenchmark).toFixed(2));
}

function buildHorizontalBarOptions({ minValue = 0, maxValue, tickFormatter, tooltipFormatter, showLegend = true }) {
  const baseOptions = marketsApp.chartOptions(minValue);

  return {
    ...baseOptions,
    indexAxis: "y",
    layout: {
      padding: { top: 4, right: 12, bottom: 0, left: 4 }
    },
    plugins: {
      ...baseOptions.plugins,
      legend: {
        display: showLegend,
        position: "top",
        align: "start",
        labels: {
          color: "#e5edf8",
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
          font: { family: "IBM Plex Mono", size: 11 }
        }
      },
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          label(context) {
            const rawValue = Number(context.parsed.x ?? context.parsed.y ?? 0);
            const formatter = tooltipFormatter || tickFormatter || currency;
            return `${context.dataset.label}: ${formatter(rawValue)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ...baseOptions.scales.y,
        min: minValue,
        ...(typeof maxValue === "number" ? { max: maxValue } : {}),
        grid: { color: "rgba(66, 85, 110, 0.55)" },
        border: { color: "rgba(36, 50, 71, 0.95)" },
        ticks: {
          ...baseOptions.scales.y.ticks,
          color: "#94a8bd",
          padding: 10,
          callback: (value) => (tickFormatter ? tickFormatter(Number(value)) : value)
        }
      },
      y: {
        ...baseOptions.scales.x,
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: {
          ...baseOptions.scales.x.ticks,
          autoSkip: false,
          color: "#eef3fb",
          padding: 12,
          font: { family: "IBM Plex Mono", size: 10 }
        }
      }
    }
  };
}

function getProvinceName(location = {}) {
  return location.province || location.officialGeolocation || location.region || "Unknown Province";
}

function normalizeCatalogLocation(location) {
  return {
    ...location,
    country: location.country || "PH",
    city: location.city || location.location,
    province: getProvinceName(location)
  };
}

function sortByLabel(left, right) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
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
    city: fallback.location,
    region: fallback.region,
    province: getProvinceName(fallback),
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
    .map((grain) => {
      const benchmark = Number.isFinite(Number(grain.nationalBenchmark)) ? Number(grain.nationalBenchmark) : grain.price;
      const spread = Number((grain.price - benchmark).toFixed(2));

      return `
        <article class="location-card ${grain.status === "Watch" ? "is-watch" : "is-stable"}">
          <div class="location-card-head">
            <p class="location-card-title">${grain.name}</p>
            <span class="location-chip ${grain.status === "Watch" ? "is-watch" : "is-stable"}">${grain.status}</span>
          </div>
          <p class="location-card-price">${grain.price.toFixed(1)} <span class="location-card-unit">${grain.unit}</span></p>
          <div class="location-card-stat-row">
            <div class="location-card-stat">
              <span class="location-card-stat-label">National Benchmark</span>
              <span class="location-card-stat-value">${benchmark.toFixed(1)} ${grain.unit}</span>
            </div>
            <div class="location-card-stat">
              <span class="location-card-stat-label">Spread</span>
              <span class="location-card-stat-value ${getSpreadToneClass(spread)}">${formatSignedNumber(spread, 1)} ${grain.unit}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLocationSummary(payload) {
  const geography = [payload.region, payload.province].filter((value, index, values) => value && values.indexOf(value) === index);
  const modeMeta = getLocationModeMeta(payload);
  const basketDelta = getAverageBasketDelta(payload.grains);

  if (locationName) locationName.textContent = payload.location;
  if (locationMeta) {
    const summaryParts = [...geography, payload.logistics].filter(Boolean);
    locationMeta.textContent = `${summaryParts.join(" | ")}${summaryParts.length ? " | " : ""}updated ${formatDateTime(payload.updatedAt)}`;
  }
  if (locationRegionValue) {
    locationRegionValue.className = "location-stat-value";
    locationRegionValue.textContent = payload.region || "National market view";
  }
  if (locationProvinceValue) {
    locationProvinceValue.className = "location-stat-value";
    locationProvinceValue.textContent = payload.province || payload.officialGeolocation || "Province mapping pending";
  }
  if (locationBasketValue) {
    if (basketDelta === null || Math.abs(basketDelta) < 0.05) {
      locationBasketValue.className = "location-stat-value tone-info";
      locationBasketValue.textContent = basketDelta === null ? "Benchmark pending" : "Benchmark aligned";
    } else {
      locationBasketValue.className = `location-stat-value ${basketDelta > 0 ? "tone-danger" : "tone-neon"}`;
      locationBasketValue.textContent = `${formatSignedCurrency(basketDelta)}/kg`;
    }
  }
  if (locationSource) {
    locationSource.textContent = modeMeta.sourceLabel;
    locationSource.className = modeMeta.sourceClassName;
  }
  if (plannerLocationName) {
    plannerLocationName.textContent = payload.location;
  }
  if (plannerLocationMeta) {
    plannerLocationMeta.textContent = `${modeMeta.plannerCopy} Updated ${formatDateTime(payload.updatedAt)}.`;
  }
}

function renderLocationCharts(payload) {
  const labels = payload.grains.map((grain) => wrapChartLabel(grain.name));
  const prices = payload.grains.map((grain) => grain.price);
  const benchmarks = payload.grains.map((grain) => (Number.isFinite(Number(grain.nationalBenchmark)) ? Number(grain.nationalBenchmark) : grain.price));
  const spreads = payload.grains.map((grain, index) => Number((grain.price - benchmarks[index]).toFixed(2)));
  const minPrice = Math.max(0, Math.floor(Math.min(...prices, ...benchmarks) * 0.9));
  const maxPrice = Math.ceil(Math.max(...prices, ...benchmarks) * 1.12);
  const maxSpreadExtent = Math.max(1, Math.ceil(Math.max(...spreads.map((spread) => Math.abs(spread)), 0.5) * 1.5));

  locationPricesChart?.destroy();
  locationPricesChart = new Chart(document.getElementById("locationPricesChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: payload.location,
          data: prices,
          backgroundColor: "rgba(35, 213, 171, 0.28)",
          borderColor: "#23d5ab",
          borderWidth: 1.5,
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 14,
          maxBarThickness: 18
        },
        {
          label: "National Benchmark",
          data: benchmarks,
          backgroundColor: "rgba(109, 167, 255, 0.18)",
          borderColor: "#6da7ff",
          borderWidth: 1.5,
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 14,
          maxBarThickness: 18
        }
      ]
    },
    options: buildHorizontalBarOptions({
      minValue: minPrice,
      maxValue: maxPrice,
      tickFormatter: currencyAxis,
      tooltipFormatter: (value) => `${currency(value)} per kg`,
      showLegend: true
    })
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
          backgroundColor: spreads.map((spread) => {
            if (spread > 0.05) return "rgba(239, 68, 68, 0.36)";
            if (spread < -0.05) return "rgba(35, 213, 171, 0.32)";
            return "rgba(109, 167, 255, 0.30)";
          }),
          borderColor: spreads.map((spread) => {
            if (spread > 0.05) return "#ef4444";
            if (spread < -0.05) return "#23d5ab";
            return "#6da7ff";
          }),
          borderWidth: 1.5,
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 16,
          maxBarThickness: 20
        }
      ]
    },
    options: buildHorizontalBarOptions({
      minValue: -maxSpreadExtent,
      maxValue: maxSpreadExtent,
      tickFormatter: (value) => (value === 0 ? "Parity" : formatSignedCurrency(value)),
      tooltipFormatter: (value) => `${formatSignedCurrency(value)} per kg`,
      showLegend: false
    })
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

  renderExchangeDesk();
}

function getSelectedTradeQuote() {
  if (!currentLocationPayload) return null;

  const selectedGrain = currentLocationPayload.grains.find((grain) => grain.key === plannerGrainSelect?.value) || currentLocationPayload.grains[0];
  const quantityKg = Math.max(1, Number(plannerQuantityInput?.value || 1));
  const totalPhp = Number((selectedGrain.price * quantityKg).toFixed(2));
  const buyRate = exchangeState.snapshot?.rates?.sell || null;
  const sellRate = exchangeState.snapshot?.rates?.buy || null;

  return {
    location: currentLocationPayload.location,
    grainKey: selectedGrain.key,
    grainName: selectedGrain.name,
    unit: selectedGrain.unit,
    unitPricePhp: selectedGrain.price,
    quantityKg,
    totalPhp,
    buyRate,
    sellRate,
    buyCostEth: buyRate ? Number((totalPhp / buyRate).toFixed(8)) : null,
    sellProceedsEth: sellRate ? Number((totalPhp / sellRate).toFixed(8)) : null
  };
}

function getPaperPortfolioKey() {
  if (!marketsApp.walletState.account) return null;
  return `${paperPortfolioStoragePrefix}:${marketsApp.walletState.chainId || "unknown"}:${marketsApp.walletState.account.toLowerCase()}`;
}

function loadPaperPortfolio() {
  const storageKey = getPaperPortfolioKey();
  if (!storageKey) return null;

  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (_error) {
    return null;
  }
}

function savePaperPortfolio(portfolio) {
  const storageKey = getPaperPortfolioKey();
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(portfolio));
}

function ensurePaperPortfolio() {
  if (!marketsApp.walletState.account) return null;

  const existing = loadPaperPortfolio();
  if (existing) return existing;

  const seededBalance = Math.max(0, Number(marketsApp.walletState.balance || 0));
  const portfolio = {
    seededFromWalletEth: seededBalance,
    cashEth: seededBalance,
    positions: {},
    trades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  savePaperPortfolio(portfolio);
  return portfolio;
}

function getPositionKey(quote) {
  return `${quote.location}::${quote.grainKey}`;
}

function findPositionMarketPrice(position) {
  const location = getLocalFallbackLocation(position.location);
  return location.grains.find((grain) => grain.key === position.grainKey)?.price || position.lastUnitPricePhp || position.avgCostPhpPerKg;
}

function computePortfolioTotals(portfolio) {
  const positions = Object.values(portfolio.positions || {});
  const holdingsPhp = positions.reduce((sum, position) => sum + findPositionMarketPrice(position) * position.quantityKg, 0);
  const holdingsEth = exchangeState.snapshot?.rates?.spot ? Number((holdingsPhp / exchangeState.snapshot.rates.spot).toFixed(8)) : null;

  return {
    holdingsPhp: Number(holdingsPhp.toFixed(2)),
    holdingsEth,
    totalEth: holdingsEth === null ? null : Number((portfolio.cashEth + holdingsEth).toFixed(8))
  };
}

function updateExchangeButtons(portfolio, quote) {
  const hasWallet = Boolean(marketsApp.walletState.account);
  const hasQuote = Boolean(quote && exchangeState.snapshot);
  const position = portfolio && quote ? portfolio.positions?.[getPositionKey(quote)] : null;

  if (walletBuyBtn) {
    walletBuyBtn.disabled = !hasWallet || !hasQuote || marketsApp.walletState.busy;
  }

  if (walletSellBtn) {
    walletSellBtn.disabled = !hasWallet || !hasQuote || marketsApp.walletState.busy || !position || position.quantityKg < quote.quantityKg;
  }
}

function renderExchangeOverview(portfolio, quote) {
  if (!exchangeOverview) return;

  const liveWalletEth = Number(marketsApp.walletState.balance || 0);
  const modeLabel = exchangeState.snapshot?.mode === "live" ? "Live Coinbase" : exchangeState.snapshot ? "Fallback" : "Waiting";

  exchangeOverview.innerHTML = `
    <article class="exchange-card">
      <p class="planner-result-label">Wallet Exchange</p>
      <p class="exchange-card-value">${exchangeState.snapshot ? currency(exchangeState.snapshot.rates.spot) : "--"}</p>
      <p class="exchange-card-copy">${modeLabel} ETH/PHP spot. Buy grain using ${exchangeState.snapshot ? currency(exchangeState.snapshot.rates.sell) : "--"} and sell using ${exchangeState.snapshot ? currency(exchangeState.snapshot.rates.buy) : "--"}.</p>
    </article>
    <article class="exchange-card">
      <p class="planner-result-label">Live Wallet</p>
      <p class="exchange-card-value">${marketsApp.walletState.account ? formatEth(liveWalletEth) : "Not connected"}</p>
      <p class="exchange-card-copy">${marketsApp.walletState.account ? `${marketsApp.walletState.walletName} on ${marketsApp.walletState.network}.` : "Connect a wallet to seed your paper trading cash."}</p>
    </article>
    <article class="exchange-card">
      <p class="planner-result-label">Paper Cash</p>
      <p class="exchange-card-value">${portfolio ? formatEth(portfolio.cashEth, 8) : "--"}</p>
      <p class="exchange-card-copy">${portfolio ? "This balance changes when you buy or sell grain inside the simulator." : "Paper cash appears after you connect a wallet."}</p>
    </article>
    <article class="exchange-card">
      <p class="planner-result-label">Current Order</p>
      <p class="exchange-card-value">${quote ? currency(quote.totalPhp) : "--"}</p>
      <p class="exchange-card-copy">${quote ? `${quote.quantityKg.toLocaleString("en-PH")} kg of ${quote.grainName} in ${quote.location}. Buy: ${quote.buyCostEth ? formatEth(quote.buyCostEth, 8) : "--"} | Sell: ${quote.sellProceedsEth ? formatEth(quote.sellProceedsEth, 8) : "--"}` : "Choose a location, grain, and quantity to price a trade."}</p>
    </article>
  `;
}

function renderExchangeHoldings(portfolio, quote) {
  if (!exchangeHoldings) return;

  if (!portfolio) {
    exchangeHoldings.innerHTML = `
      <div class="planner-result-grid">
        <article class="planner-result-card">
          <p class="planner-result-label">Portfolio</p>
          <p class="planner-result-value">Connect wallet</p>
          <p class="planner-result-copy">Wallet-linked paper holdings appear here after you connect and seed the simulator.</p>
        </article>
      </div>
    `;
    return;
  }

  const position = quote ? portfolio.positions?.[getPositionKey(quote)] : null;
  const totals = computePortfolioTotals(portfolio);

  exchangeHoldings.innerHTML = `
    <div class="planner-result-grid">
      <article class="planner-result-card">
        <p class="planner-result-label">Selected Holding</p>
        <p class="planner-result-value">${position ? `${position.quantityKg.toLocaleString("en-PH")} kg` : "0 kg"}</p>
        <p class="planner-result-copy">${position ? `${position.grainName} in ${position.location} at an average paper cost of ${currency(position.avgCostPhpPerKg)} per kg.` : "No holdings yet for the selected grain and market."}</p>
      </article>
      <article class="planner-result-card">
        <p class="planner-result-label">Holdings Value</p>
        <p class="planner-result-value">${currency(totals.holdingsPhp)}</p>
        <p class="planner-result-copy">${totals.holdingsEth === null ? "Waiting for exchange rate." : `${formatEth(totals.holdingsEth, 8)} at the current spot rate.`}</p>
      </article>
      <article class="planner-result-card">
        <p class="planner-result-label">Portfolio Value</p>
        <p class="planner-result-value">${totals.totalEth === null ? formatEth(portfolio.cashEth, 8) : formatEth(totals.totalEth, 8)}</p>
        <p class="planner-result-copy">Paper cash plus mark-to-market grain holdings. This is a simulator and does not move onchain funds.</p>
      </article>
    </div>
  `;
}

function renderExchangeTrades(portfolio) {
  if (!exchangeTrades) return;

  const trades = portfolio?.trades || [];
  if (!trades.length) {
    exchangeTrades.innerHTML = `
      <div class="planner-result-grid">
        <article class="planner-result-card">
          <p class="planner-result-label">Recent Trades</p>
          <p class="planner-result-value">No trades yet</p>
          <p class="planner-result-copy">Use the wallet exchange desk to simulate buying or selling grain from the selected market.</p>
        </article>
      </div>
    `;
    return;
  }

  exchangeTrades.innerHTML = `
    <div class="trade-log">
      ${trades
        .map(
          (trade) => `
            <article class="trade-log-item">
              <div class="trade-log-head">
                <div>
                  <p class="strong">${trade.grainName}</p>
                  <p class="muted">${trade.location} | ${new Date(trade.createdAt).toLocaleString("en-PH", { hour12: false })}</p>
                </div>
                <span class="trade-log-side ${trade.side === "BUY" ? "is-buy" : "is-sell"}">${trade.side}</span>
              </div>
              <p class="exchange-card-copy">${trade.quantityKg.toLocaleString("en-PH")} kg at ${currency(trade.unitPricePhp)} per kg. ${trade.side === "BUY" ? "Spent" : "Received"} ${formatEth(trade.totalEth, 8)} using a ${currency(trade.referenceRate)} ETH/PHP reference.</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderExchangeStatus(message, tone = "cool") {
  if (exchangeStatus) {
    exchangeStatus.textContent = message;
  }

  if (exchangeModePill) {
    exchangeModePill.textContent = exchangeState.snapshot?.mode === "live" ? "Live Coinbase" : exchangeState.snapshot ? "Fallback" : "Waiting";
    exchangeModePill.className = `heatmap-pill ${tone === "warm" ? "is-warm" : tone === "hot" ? "is-hot" : "is-cool"}`;
  }
}

function renderExchangeDesk(statusMessage, tone = "cool") {
  const quote = getSelectedTradeQuote();
  const portfolio = marketsApp.walletState.account ? ensurePaperPortfolio() : null;

  exchangeState.portfolio = portfolio;
  updateExchangeButtons(portfolio, quote);
  renderExchangeOverview(portfolio, quote);
  renderExchangeHoldings(portfolio, quote);
  renderExchangeTrades(portfolio);

  if (statusMessage) {
    renderExchangeStatus(statusMessage, tone);
    return;
  }

  if (!marketsApp.walletState.account) {
    renderExchangeStatus("Use the wallet button in the header to connect before simulating trades.", "cool");
    return;
  }

  if (!exchangeState.snapshot) {
    renderExchangeStatus("Fetching the current wallet exchange reference...", "cool");
    return;
  }

  renderExchangeStatus(`Paper trading is ready. The current ${exchangeState.snapshot.pair} spot rate is ${currency(exchangeState.snapshot.rates.spot)}.`, exchangeState.snapshot.mode === "live" ? "warm" : "cool");
}

function persistPortfolio(portfolio) {
  portfolio.updatedAt = new Date().toISOString();
  savePaperPortfolio(portfolio);
  exchangeState.portfolio = portfolio;
}

function recordTrade(portfolio, trade) {
  portfolio.trades = [trade, ...(portfolio.trades || [])].slice(0, maxTradeHistory);
}

function executePaperTrade(side) {
  const quote = getSelectedTradeQuote();
  const portfolio = ensurePaperPortfolio();

  if (!portfolio || !quote || !exchangeState.snapshot) {
    renderExchangeDesk("Connect a wallet and wait for the exchange desk to finish loading before trading.", "cool");
    return;
  }

  const positionKey = getPositionKey(quote);
  const existingPosition = portfolio.positions[positionKey] || {
    location: quote.location,
    grainKey: quote.grainKey,
    grainName: quote.grainName,
    quantityKg: 0,
    avgCostPhpPerKg: 0,
    avgCostEthPerKg: 0,
    lastUnitPricePhp: quote.unitPricePhp
  };

  if (side === "BUY") {
    if (portfolio.cashEth < quote.buyCostEth) {
      renderExchangeDesk(`Insufficient paper cash. You need ${formatEth(quote.buyCostEth, 8)} but only have ${formatEth(portfolio.cashEth, 8)}.`, "hot");
      return;
    }

    const updatedQuantity = existingPosition.quantityKg + quote.quantityKg;
    existingPosition.avgCostPhpPerKg =
      ((existingPosition.avgCostPhpPerKg * existingPosition.quantityKg) + quote.totalPhp) / updatedQuantity;
    existingPosition.avgCostEthPerKg =
      ((existingPosition.avgCostEthPerKg * existingPosition.quantityKg) + quote.buyCostEth) / updatedQuantity;
    existingPosition.quantityKg = updatedQuantity;
    existingPosition.lastUnitPricePhp = quote.unitPricePhp;
    existingPosition.updatedAt = new Date().toISOString();
    portfolio.positions[positionKey] = existingPosition;
    portfolio.cashEth = Number((portfolio.cashEth - quote.buyCostEth).toFixed(8));

    recordTrade(portfolio, {
      side: "BUY",
      grainName: quote.grainName,
      location: quote.location,
      quantityKg: quote.quantityKg,
      unitPricePhp: quote.unitPricePhp,
      totalEth: quote.buyCostEth,
      referenceRate: quote.buyRate,
      createdAt: new Date().toISOString()
    });

    persistPortfolio(portfolio);
    renderExchangeDesk(`Bought ${quote.quantityKg.toLocaleString("en-PH")} kg of ${quote.grainName} for ${formatEth(quote.buyCostEth, 8)} in paper cash.`, "warm");
    marketsApp.updateFooterStatus(`Last update: paper buy executed for ${quote.grainName} in ${quote.location}`);
    return;
  }

  if (existingPosition.quantityKg < quote.quantityKg) {
    renderExchangeDesk(`Not enough grain to sell. You hold ${existingPosition.quantityKg.toLocaleString("en-PH")} kg but tried to sell ${quote.quantityKg.toLocaleString("en-PH")} kg.`, "hot");
    return;
  }

  const remainingQuantity = Number((existingPosition.quantityKg - quote.quantityKg).toFixed(4));
  portfolio.cashEth = Number((portfolio.cashEth + quote.sellProceedsEth).toFixed(8));

  if (remainingQuantity <= 0) {
    delete portfolio.positions[positionKey];
  } else {
    existingPosition.quantityKg = remainingQuantity;
    existingPosition.lastUnitPricePhp = quote.unitPricePhp;
    existingPosition.updatedAt = new Date().toISOString();
    portfolio.positions[positionKey] = existingPosition;
  }

  recordTrade(portfolio, {
    side: "SELL",
    grainName: quote.grainName,
    location: quote.location,
    quantityKg: quote.quantityKg,
    unitPricePhp: quote.unitPricePhp,
    totalEth: quote.sellProceedsEth,
    referenceRate: quote.sellRate,
    createdAt: new Date().toISOString()
  });

  persistPortfolio(portfolio);
  renderExchangeDesk(`Sold ${quote.quantityKg.toLocaleString("en-PH")} kg of ${quote.grainName} for ${formatEth(quote.sellProceedsEth, 8)} in paper cash.`, "warm");
  marketsApp.updateFooterStatus(`Last update: paper sell executed for ${quote.grainName} in ${quote.location}`);
}

async function fetchWalletExchange() {
  try {
    const response = await fetch("/api/v1/wallet-exchange?base=ETH&quote=PHP");
    if (!response.ok) throw new Error("Wallet exchange fetch failed");
    exchangeState.snapshot = await response.json();
  } catch (_error) {
    exchangeState.snapshot = null;
  }

  renderExchangeDesk();
}

function getLocationCatalogEntry(value) {
  return locationCatalog.find((location) => location.location === value || location.slug === value) || null;
}

function normalizeLocationTaxonomy(taxonomy = []) {
  return taxonomy.map((region) => ({
    ...region,
    provinces: (region.provinces || []).map((province) =>
      typeof province === "string" ? { province, hasPilotCity: false } : province
    )
  }));
}

function buildLocalLocationTaxonomy(locations) {
  const taxonomyMap = new Map();

  locations.forEach((location) => {
    if (!location.region || !location.province) return;

    if (!taxonomyMap.has(location.region)) {
      taxonomyMap.set(location.region, {
        region: location.region,
        provinces: new Map()
      });
    }

    taxonomyMap.get(location.region).provinces.set(location.province, {
      province: location.province,
      hasPilotCity: true
    });
  });

  return [...taxonomyMap.values()]
    .sort((left, right) => sortByLabel(left.region, right.region))
    .map((entry) => ({
      region: entry.region,
      provinces: [...entry.provinces.values()].sort((left, right) => sortByLabel(left.province, right.province))
    }));
}

function getLocationRegions() {
  return locationTaxonomy.map((region) => region.region);
}

function getRegionTaxonomy(region) {
  return locationTaxonomy.find((entry) => entry.region === region) || null;
}

function getLocationProvinces(region) {
  return getRegionTaxonomy(region)?.provinces || [];
}

function getPreferredProvince(region, preferredProvince) {
  const provinces = getLocationProvinces(region);

  if (provinces.some((province) => province.province === preferredProvince)) {
    return preferredProvince;
  }

  return provinces.find((province) => province.hasPilotCity)?.province || provinces[0]?.province || "";
}

function getLocationCities(region, province) {
  return locationCatalog
    .filter((location) => (!region || location.region === region) && (!province || location.province === province))
    .sort((left, right) => sortByLabel(left.location, right.location));
}

function setSelectOptions(select, options, selectedValue, emptyLabel = "No options available") {
  if (!select) return "";

  const normalizedOptions = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  select.innerHTML = "";

  if (!normalizedOptions.length) {
    select.add(new Option(emptyLabel, ""));
    select.value = "";
    select.disabled = true;
    return "";
  }

  select.disabled = false;

  normalizedOptions.forEach((option) => {
    select.add(new Option(option.label, option.value));
  });

  const nextValue = normalizedOptions.some((option) => option.value === selectedValue) ? selectedValue : normalizedOptions[0]?.value || "";

  if (nextValue) select.value = nextValue;
  return nextValue;
}

function renderSelectorGroup(group, selection = {}) {
  if (!group.regionSelect || !group.provinceSelect || !group.citySelect || !locationCatalog.length) return "";

  const locationEntry = selection.location ? getLocationCatalogEntry(selection.location) : null;
  const selectedRegion = setSelectOptions(
    group.regionSelect,
    getLocationRegions(),
    selection.region || locationEntry?.region || group.regionSelect.value,
    "No Philippine regions available"
  );
  const provinceOptions = getLocationProvinces(selectedRegion);
  const selectedProvince = setSelectOptions(
    group.provinceSelect,
    provinceOptions.map((province) => ({
      value: province.province,
      label: province.province
    })),
    getPreferredProvince(selectedRegion, selection.province || locationEntry?.province || group.provinceSelect.value),
    selectedRegion ? `No provinces mapped for ${selectedRegion}` : "Select a region first"
  );
  const cities = getLocationCities(selectedRegion, selectedProvince);

  return setSelectOptions(
    group.citySelect,
    cities.map((location) => ({
      value: location.location,
      label: location.city || location.location
    })),
    selection.location || group.citySelect.value,
    selectedProvince ? `No city or municipality is available in ${selectedProvince}` : "Select a province first"
  );
}

function syncLocationSelectors(value) {
  if (!locationCatalog.length) {
    if (locationSelect) locationSelect.value = value;
    return;
  }

  renderSelectorGroup(locationSelectorGroup, { location: value });
}

function populateLocationSelects(locations, defaultLocation, taxonomy = []) {
  locationCatalog = locations.map(normalizeCatalogLocation).sort((left, right) => sortByLabel(left.location, right.location));
  locationTaxonomy = normalizeLocationTaxonomy(
    taxonomy.length ? taxonomy : marketsData.phLocationTaxonomy || buildLocalLocationTaxonomy(locationCatalog)
  );
  syncLocationSelectors(defaultLocation);
}

function updateLocationFromGroup(group, selection) {
  const nextLocation = renderSelectorGroup(group, selection);
  if (nextLocation) {
    fetchLocationPrices(nextLocation);
    return;
  }

  if (locationStatus) {
    const region = group.regionSelect?.value;
    const province = group.provinceSelect?.value;
    locationStatus.textContent = province
      ? `No city or municipality is available yet for ${province}, ${region}.`
      : "Select a Philippine region, province, and city or municipality to load a market.";
  }
}

async function fetchLocationPrices(location) {
  if (locationFetchController) locationFetchController.abort();
  locationFetchController = new AbortController();
  const signal = locationFetchController.signal;

  if (locationStatus) locationStatus.textContent = `Fetching ${location}...`;

  try {
    const response = await fetch(`/api/v1/location-prices?location=${encodeURIComponent(location)}`, { signal });
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
          : payload.mode === "official"
            ? `Loaded ${payload.location} using the official ${payload.officialGeolocation} reference.`
            : payload.mode === "national-fallback"
              ? `Loaded ${payload.location} using the national benchmark fallback.`
            : `Loaded ${payload.location} pilot prices successfully.`;
    }
    marketsApp.updateFooterStatus(`Last update: loaded ${payload.location} grain prices`);
  } catch (error) {
    if (error.name === "AbortError") return;
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
    populateLocationSelects(
      payload.locations,
      payload.defaultLocation || marketsData.locationDefaults.selectedLocation,
      payload.taxonomy || []
    );
  } catch (_error) {
    populateLocationSelects(
      marketsData.locationMarkets,
      marketsData.locationDefaults.selectedLocation,
      marketsData.phLocationTaxonomy || []
    );
  }

  await fetchLocationPrices((locationSelect && locationSelect.value) || marketsData.locationDefaults.selectedLocation);
  await fetchWalletExchange();
}

locationRegionSelect?.addEventListener("change", (event) => {
  updateLocationFromGroup(locationSelectorGroup, { region: event.target.value });
});

locationProvinceSelect?.addEventListener("change", (event) => {
  updateLocationFromGroup(locationSelectorGroup, {
    region: locationRegionSelect?.value,
    province: event.target.value
  });
});

locationSelect?.addEventListener("change", (event) => {
  fetchLocationPrices(event.target.value);
});

plannerGrainSelect?.addEventListener("change", updatePlanner);
plannerQuantityInput?.addEventListener("input", updatePlanner);
walletBuyBtn?.addEventListener("click", () => executePaperTrade("BUY"));
walletSellBtn?.addEventListener("click", () => executePaperTrade("SELL"));

window.addEventListener("grainwatch:wallet-updated", () => {
  renderExchangeDesk();
});

initializeLocationExplorer();
