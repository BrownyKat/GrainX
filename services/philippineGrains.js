const siteData = require("../data/site");
const { withCache } = require("./cache");
const pxWeb = require("./psaPxWeb");

const CACHE_TTL_MS = Number(process.env.GRAINWATCH_CACHE_TTL_MS || 15 * 60 * 1000);
const PSA_BASE_URL = process.env.PSA_PXWEB_BASE || "https://openstat.psa.gov.ph/PXWeb/api/v1/en";

const SOURCE_TABLES = {
  retail: {
    tableId: "0042M4ARN01",
    path: process.env.PSA_RETAIL_TABLE || "DB/DB__2M__2018NEW/0042M4ARN01.px",
    source: "PSA OpenSTAT",
    dataset: "Monthly Retail Prices of Cereals"
  },
  farmgate: {
    tableId: "0032M4AFN01",
    path: process.env.PSA_FARMGATE_TABLE || "DB/DB__2M__NFG/0032M4AFN01.px",
    source: "PSA OpenSTAT",
    dataset: "Monthly Farmgate Prices of Cereals"
  }
};

const GRAIN_SERIES = [
  {
    key: "regularRice",
    label: "Regular-Milled Rice",
    unit: "PHP/kg",
    table: "retail",
    matchers: [/regular[- ]milled/i, /rice.*regular/i]
  },
  {
    key: "wellMilledRice",
    label: "Well-Milled Rice",
    unit: "PHP/kg",
    table: "retail",
    matchers: [/well[- ]milled/i, /rice.*well/i]
  },
  {
    key: "yellowCorn",
    label: "Yellow Corn",
    unit: "PHP/kg",
    table: "farmgate",
    matchers: [/yellow.*corn/i, /corn.*yellow/i, /maize.*yellow/i]
  },
  {
    key: "whiteCorn",
    label: "White Corn",
    unit: "PHP/kg",
    table: "farmgate",
    matchers: [/white.*corn/i, /corn.*white/i, /maize.*white/i]
  }
];

function normalizeLocation(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

function createOrderMap(entries) {
  return new Map(entries.map((entry, index) => [entry.code, index]));
}

function getThresholdFor(key) {
  return siteData.settings.thresholds[key];
}

function buildMatchers(value, fallbackPattern) {
  const escaped = pxWeb.escapeRegex(value);
  return [new RegExp(`^${escaped}$`, "i"), new RegExp(escaped, "i"), ...(fallbackPattern ? [fallbackPattern] : [])];
}

function matchRowLabel(entry, matchers) {
  return matchers.some((matcher) => matcher.test(`${entry.code} ${entry.label}`));
}

async function fetchSeriesTable(tableKey, { geolocation = "Philippines", periods = 6 } = {}) {
  const table = SOURCE_TABLES[tableKey];
  const metadata = await withCache(`psa:meta:${tableKey}`, CACHE_TTL_MS, () =>
    pxWeb.fetchPxMetadata(PSA_BASE_URL, table.path)
  );

  const geographyVariable = pxWeb.findVariable(metadata, [/geolocation/i, /\bgeo\b/i, /location/i]);
  const commodityVariable = pxWeb.findVariable(metadata, [/commodity/i, /item/i, /cereal/i]);
  const yearVariable = pxWeb.findVariable(metadata, [/year/i]);
  const periodVariable = pxWeb.findVariable(metadata, [/period/i, /month/i]);

  if (!geographyVariable || !commodityVariable || !yearVariable || !periodVariable) {
    throw new Error(`Could not resolve variables for ${table.dataset}`);
  }

  const selectedSeries = GRAIN_SERIES.filter((series) => series.table === tableKey);
  const selectedCommodities = selectedSeries
    .map((series) => ({
      series,
      value: pxWeb.pickValue(commodityVariable, series.matchers)
    }))
    .filter((item) => item.value);

  if (!selectedCommodities.length) {
    throw new Error(`No commodity mappings matched for ${table.dataset}`);
  }

  const geographyValue =
    pxWeb.pickValue(geographyVariable, buildMatchers(geolocation, /philippines/i)) ||
    pxWeb.pickValue(geographyVariable, [/philippines/i]);

  if (!geographyValue) {
    throw new Error(`Could not match geolocation "${geolocation}" in ${table.dataset}`);
  }

  const selectedYears = pxWeb.pickLatestValues(yearVariable, 1);
  const selectedPeriods = pxWeb.pickLatestValues(periodVariable, Math.max(1, periods));
  const selectedVariableCodes = new Set([
    geographyVariable.code,
    commodityVariable.code,
    yearVariable.code,
    periodVariable.code
  ]);

  const query = [
    pxWeb.buildSelection(geographyVariable, [geographyValue]),
    pxWeb.buildSelection(
      commodityVariable,
      selectedCommodities.map((item) => item.value)
    ),
    pxWeb.buildSelection(yearVariable, selectedYears),
    pxWeb.buildSelection(periodVariable, selectedPeriods)
  ];

  pxWeb.getVariables(metadata).forEach((variable) => {
    if (selectedVariableCodes.has(variable.code)) return;

    const firstValue = pxWeb.pickFirstValue(variable);
    if (firstValue) {
      query.push(pxWeb.buildSelection(variable, [firstValue]));
    }
  });

  const payload = await withCache(
    `psa:data:${tableKey}:${geographyValue.code}:${selectedYears.map((entry) => entry.code).join(",")}:${selectedPeriods
      .map((entry) => entry.code)
      .join(",")}`,
    CACHE_TTL_MS,
    () =>
      pxWeb.queryPxTable(PSA_BASE_URL, table.path, {
        query,
        response: { format: "json-stat2" }
      })
  );

  const rows = pxWeb.rowsFromJsonStat(payload);
  const yearOrder = createOrderMap(selectedYears);
  const periodOrder = createOrderMap(selectedPeriods);

  return {
    table,
    geography: geographyValue,
    updated: metadata.updated || payload.updated || null,
    items: selectedCommodities.map(({ series, value }) => {
      const matchedRows = rows
        .filter((row) => row[commodityVariable.code] && matchRowLabel(row[commodityVariable.code], series.matchers))
        .sort((left, right) => {
          const leftYear = yearOrder.get(left[yearVariable.code]?.code) || 0;
          const rightYear = yearOrder.get(right[yearVariable.code]?.code) || 0;

          if (leftYear !== rightYear) return leftYear - rightYear;

          const leftPeriod = periodOrder.get(left[periodVariable.code]?.code) || 0;
          const rightPeriod = periodOrder.get(right[periodVariable.code]?.code) || 0;
          return leftPeriod - rightPeriod;
        });

      const latestRow = matchedRows[matchedRows.length - 1] || null;

      return {
        key: series.key,
        label: series.label,
        unit: series.unit,
        source: table.source,
        dataset: table.dataset,
        tableId: table.tableId,
        geolocation: geographyValue.label,
        apiPath: `${PSA_BASE_URL}/${table.path}`,
        updated: metadata.updated || payload.updated || null,
        matchedCommodity: value.label,
        latest: latestRow
          ? {
              value: latestRow.value,
              year: latestRow[yearVariable.code]?.label || selectedYears[selectedYears.length - 1]?.label || "",
              period: latestRow[periodVariable.code]?.label || selectedPeriods[selectedPeriods.length - 1]?.label || ""
            }
          : null,
        history: matchedRows.map((row) => ({
          year: row[yearVariable.code]?.label || "",
          period: row[periodVariable.code]?.label || "",
          value: row.value
        }))
      };
    })
  };
}

function buildAlertSummary(grains) {
  return grains
    .filter((grain) => grain.latest && typeof grain.latest.value === "number")
    .map((grain) => {
      const threshold = getThresholdFor(grain.key);
      const variance = Number((grain.latest.value - threshold).toFixed(2));

      return {
        key: grain.key,
        commodity: grain.label,
        threshold,
        currentValue: grain.latest.value,
        variance,
        status: grain.latest.value >= threshold ? "Active" : "Resolved",
        period: `${grain.latest.period} ${grain.latest.year}`.trim()
      };
    });
}

function getLocationCatalog() {
  return siteData.locationMarkets.map((location) => ({
    slug: location.slug,
    location: location.location,
    region: location.region,
    officialGeolocation: location.officialGeolocation,
    source: location.source,
    updatedAt: location.updatedAt,
    logistics: location.logistics
  }));
}

function findLocationMarket(locationQuery) {
  const normalizedQuery = normalizeLocation(locationQuery || siteData.locationDefaults.selectedLocation);

  return (
    siteData.locationMarkets.find((location) => normalizeLocation(location.location) === normalizedQuery) ||
    siteData.locationMarkets.find((location) => normalizeLocation(location.slug) === normalizedQuery) ||
    siteData.locationMarkets.find((location) => normalizeLocation(location.region) === normalizedQuery) ||
    null
  );
}

async function getLocationPriceSnapshot(options = {}) {
  const location =
    findLocationMarket(options.location) ||
    findLocationMarket(siteData.locationDefaults.selectedLocation);

  if (!location) {
    throw new Error(`Unknown location "${options.location}"`);
  }

  const nationalBenchmarks = new Map(siteData.commodities.map((commodity) => [commodity.key, commodity]));

  let official = null;

  if (options.includeOfficial !== false && location.officialGeolocation) {
    try {
      official = await getLivePhilippineGrainSummary({
        geolocation: location.officialGeolocation,
        periods: Number(options.periods || 6)
      });
    } catch (_error) {
      official = null;
    }
  }

  return {
    ok: true,
    mode: official ? "official+pilot" : "pilot",
    generatedAt: new Date().toISOString(),
    location: location.location,
    region: location.region,
    officialGeolocation: location.officialGeolocation,
    source: location.source,
    updatedAt: location.updatedAt,
    logistics: location.logistics,
    grains: location.grains.map((grain) => {
      const national = nationalBenchmarks.get(grain.key);

      return {
        ...grain,
        nationalBenchmark: national?.value ?? null,
        threshold: siteData.settings.thresholds[grain.key] ?? null,
        status:
          typeof siteData.settings.thresholds[grain.key] === "number" && grain.price >= siteData.settings.thresholds[grain.key]
            ? "Watch"
            : "Stable"
      };
    }),
    official
  };
}

async function getLivePhilippineGrainSummary(options = {}) {
  const geolocation = options.geolocation || "Philippines";
  const periods = Number(options.periods || 6);
  const requestedKeys = options.keys?.length ? new Set(options.keys) : null;

  return withCache(`philippine-grains:${geolocation}:${periods}:${[...(requestedKeys || [])].join(",")}`, CACHE_TTL_MS, async () => {
    const [retail, farmgate] = await Promise.all([
      fetchSeriesTable("retail", { geolocation, periods }),
      fetchSeriesTable("farmgate", { geolocation, periods })
    ]);

    const grains = [...retail.items, ...farmgate.items].filter((grain) => {
      if (!requestedKeys) return true;
      return requestedKeys.has(grain.key);
    });

    return {
      ok: true,
      mode: "official",
      generatedAt: new Date().toISOString(),
      geolocation,
      grains,
      alerts: buildAlertSummary(grains),
      sources: [
        {
          key: "retail",
          source: retail.table.source,
          dataset: retail.table.dataset,
          tableId: retail.table.tableId,
          updated: retail.updated,
          geolocation: retail.geography.label
        },
        {
          key: "farmgate",
          source: farmgate.table.source,
          dataset: farmgate.table.dataset,
          tableId: farmgate.table.tableId,
          updated: farmgate.updated,
          geolocation: farmgate.geography.label
        }
      ]
    };
  });
}

function getIntegrationCatalog() {
  return {
    baseUrl: PSA_BASE_URL,
    tables: Object.values(SOURCE_TABLES).map((table) => ({
      source: table.source,
      dataset: table.dataset,
      tableId: table.tableId,
      apiPath: `${PSA_BASE_URL}/${table.path}`
    })),
    routes: siteData.settings.apiRoutes
  };
}

module.exports = {
  getIntegrationCatalog,
  getLivePhilippineGrainSummary,
  getLocationCatalog,
  getLocationPriceSnapshot
};
