const express = require("express");
const path = require("path");

const siteData = require("./data/site");
const {
  getIntegrationCatalog,
  getLivePhilippineGrainSummary,
  getLocationCatalog,
  getLocationPriceSnapshot
} = require("./services/philippineGrains");

const app = express();
const port = process.env.PORT || 3000;

const pages = {
  markets: {
    slug: "markets",
    title: "Markets",
    eyebrow: "Grains Board",
    heading: "Philippine Grains Prices",
    description: "Follow Philippine rice and corn price boards with city comparison, regional spread checks, and procurement tools."
  },
  dashboard: {
    slug: "dashboard",
    title: "Overview",
    eyebrow: "Market Terminal",
    heading: "Philippine Grains Overview",
    description: "Track core Philippine grain contracts, compare city pricing, and move from price discovery to a Base-ready market ticket."
  },
  reports: {
    slug: "reports",
    title: "Reports",
    eyebrow: "Forward Views",
    heading: "Forward Curves and Analytics",
    description: "Review projections, volatility, and desk recommendations for Philippine rice and corn markets."
  },
  oracle: {
    slug: "oracle",
    title: "Base Desk",
    eyebrow: "Web3",
    heading: "Base Attestation Desk",
    description: `Switch to ${siteData.baseDesk.preferredChain}, connect Coinbase Wallet, the Base App, or MetaMask, and sign a typed-data grain ticket from Philippine price and location inputs.`
  },
  alerts: {
    slug: "alerts",
    title: "Alerts",
    eyebrow: "Risk",
    heading: "Alerts and Resolution Workflow",
    description: "Track active Philippine alerts, owners, history, and the exact steps for closure."
  },
  settings: {
    slug: "settings",
    title: "Settings",
    eyebrow: "Config",
    heading: "System Configuration",
    description: "Manage thresholds, official-source integrations, notifications, and controls for Philippine grain operations."
  }
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function renderPage(pageKey) {
  return (_req, res) => {
    const page = pages[pageKey];

    res.render("layout", {
      site: siteData,
      page,
      pages,
      currentPage: pageKey,
      serializedData: JSON.stringify(siteData),
      pageCss: [`${pageKey}.css`],
      pageScript: `/js/pages/${pageKey}.js`
    });
  };
}

app.get("/", (_req, res) => {
  res.redirect("/markets");
});

Object.keys(pages).forEach((pageKey) => {
  app.get(`/${pageKey}`, renderPage(pageKey));
});

app.get("/api/site", (_req, res) => {
  res.json(siteData);
});

app.get("/api/v1/grains/snapshot", (_req, res) => {
  res.json({
    ok: true,
    mode: "snapshot",
    generatedAt: new Date().toISOString(),
    commodities: siteData.commodities,
    history: siteData.history,
    thresholds: siteData.settings.thresholds
  });
});

app.get("/api/v1/grains/live", async (req, res) => {
  try {
    const geolocation = req.query.geolocation || "Philippines";
    const periods = Number.isFinite(Number(req.query.periods)) && Number(req.query.periods) > 0 ? Number(req.query.periods) : 6;
    const keys = req.query.keys ? String(req.query.keys).split(",").map((key) => key.trim()).filter(Boolean) : [];
    const payload = await getLivePhilippineGrainSummary({
      geolocation,
      periods,
      keys
    });

    res.json(payload);
  } catch (error) {
    res.status(502).json({
      ok: false,
      mode: "official",
      error: "OFFICIAL_SOURCE_UNAVAILABLE",
      message: error.message,
      generatedAt: new Date().toISOString(),
      fallback: {
        mode: "snapshot",
        route: "/api/v1/grains/snapshot"
      }
    });
  }
});

app.get("/api/v1/alerts/evaluate", async (req, res) => {
  try {
    const liveData = await getLivePhilippineGrainSummary({
      geolocation: req.query.geolocation || "Philippines",
      periods: Number.isFinite(Number(req.query.periods)) && Number(req.query.periods) > 0 ? Number(req.query.periods) : 6
    });

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      thresholds: siteData.settings.thresholds,
      alerts: liveData.alerts
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "ALERT_EVALUATION_FAILED",
      message: error.message
    });
  }
});

app.get("/api/v1/integration", (_req, res) => {
  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    catalog: getIntegrationCatalog()
  });
});

app.get("/api/v1/base/config", (_req, res) => {
  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    config: siteData.baseDesk
  });
});

app.get("/api/v1/locations", (_req, res) => {
  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    defaultLocation: siteData.locationDefaults.selectedLocation,
    locations: getLocationCatalog()
  });
});

app.get("/api/v1/location-prices", async (req, res) => {
  try {
    const payload = await getLocationPriceSnapshot({
      location: req.query.location || siteData.locationDefaults.selectedLocation,
      includeOfficial: req.query.includeOfficial !== "false",
      periods: Number.isFinite(Number(req.query.periods)) && Number(req.query.periods) > 0 ? Number(req.query.periods) : 6
    });

    res.json(payload);
  } catch (error) {
    res.status(404).json({
      ok: false,
      error: "LOCATION_NOT_FOUND",
      message: error.message
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "grainwatch-fused",
    generatedAt: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`GrainWatch listening on http://localhost:${port}`);
});
