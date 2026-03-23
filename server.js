const express = require("express");
const path = require("path");

const siteData = require("./data/site");
const {
  getIntegrationCatalog,
  getLivePhilippineGrainSummary,
  getLocationPriceSnapshot
} = require("./services/philippineGrains");
const { getCoinbaseWalletExchange } = require("./services/coinbaseRates");
const { getPhilippineLocationDirectoryWithFallback } = require("./services/phLocations");

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", true);

// Basic Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Security Headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

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
    description: `Connect Coinbase Wallet on ${siteData.baseDesk.preferredChain} and sign a typed-data grain ticket from Philippine price and location inputs.`
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

function trimTrailingSlash(value = "") {
  return value.replace(/\/+$/, "");
}

function getPublicOrigin(req) {
  const configuredOrigin = trimTrailingSlash(process.env.PUBLIC_APP_URL || "");
  if (configuredOrigin) return configuredOrigin;

  const forwardedProtocol = String(req.get("x-forwarded-proto") || req.protocol || "https")
    .split(",")[0]
    .trim();

  return `${forwardedProtocol}://${req.get("host")}`;
}

function getMiniAppTags() {
  const tags = String(process.env.BASE_MINIAPP_TAGS || "grainwatch,agriculture,markets,base")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length ? tags : ["grainwatch", "agriculture", "markets", "base"];
}

function buildFramePayload(req, page) {
  const origin = getPublicOrigin(req);
  const routePath = page?.slug ? `/${page.slug}` : "/markets";
  const frameUrl = `${origin}${routePath}`;

  return {
    version: "next",
    imageUrl: `${origin}/base/embed.svg`,
    button: {
      title: page?.slug === "oracle" ? "Open Base Desk" : "Open GrainWatch",
      action: {
        type: "launch_frame",
        name: siteData.meta.brand,
        url: frameUrl,
        splashImageUrl: `${origin}/base/splash.svg`,
        splashBackgroundColor: "#08101a"
      }
    }
  };
}

function buildPageMeta(req, page) {
  const origin = getPublicOrigin(req);
  const routePath = page.slug ? `/${page.slug}` : "/markets";
  const pageUrl = `${origin}${routePath}`;
  const framePayload = buildFramePayload(req, page);
  const serializedFramePayload = JSON.stringify(framePayload).replace(/</g, "\\u003c");

  return {
    title: `${page.heading} | ${siteData.meta.brand}`,
    description: page.description,
    canonicalUrl: pageUrl,
    imageUrl: `${origin}/base/embed.svg`,
    themeColor: "#08101a",
    frameJson: serializedFramePayload,
    miniAppJson: serializedFramePayload
  };
}

function buildMiniAppManifest(req) {
  const origin = getPublicOrigin(req);
  const canonicalDomain = new URL(origin).host;
  const manifest = {
    accountAssociation: {
      header: process.env.BASE_FARCASTER_HEADER || "PASTE_BASE_DEV_ACCOUNT_ASSOCIATION_HEADER",
      payload: process.env.BASE_FARCASTER_PAYLOAD || "PASTE_BASE_DEV_ACCOUNT_ASSOCIATION_PAYLOAD",
      signature: process.env.BASE_FARCASTER_SIGNATURE || "PASTE_BASE_DEV_ACCOUNT_ASSOCIATION_SIGNATURE"
    },
    miniapp: {
      version: "1",
      name: siteData.meta.brand,
      subtitle: process.env.BASE_APP_SUBTITLE || "Philippine grain intelligence",
      description:
        process.env.BASE_APP_DESCRIPTION ||
        "Track Philippine rice and corn prices, compare cities, and create Base-ready grain tickets.",
      iconUrl: `${origin}/base/icon.svg`,
      homeUrl: `${origin}/markets`,
      splashImageUrl: `${origin}/base/splash.svg`,
      splashBackgroundColor: "#08101a",
      canonicalDomain,
      primaryCategory: process.env.BASE_MINIAPP_CATEGORY || "finance",
      tags: getMiniAppTags(),
      requiredChains: [`eip155:${siteData.baseDesk.chainId}`],
      screenshotUrls: [
        `${origin}/base/screen-market.svg`,
        `${origin}/base/screen-oracle.svg`
      ],
      ogTitle: process.env.BASE_APP_OG_TITLE || "GrainWatch PH",
      ogDescription:
        process.env.BASE_APP_OG_DESCRIPTION ||
        "Philippine grain intelligence with a Base-ready ticket workflow.",
      ogImageUrl: `${origin}/base/embed.svg`
    }
  };

  if (process.env.BASE_WEBHOOK_URL) {
    manifest.miniapp.webhookUrl = process.env.BASE_WEBHOOK_URL;
  }

  if (process.env.BASE_BUILDER_OWNER_ADDRESS) {
    manifest.baseBuilder = {
      ownerAddress: process.env.BASE_BUILDER_OWNER_ADDRESS
    };
  }

  return manifest;
}

function buildFallbackWalletExchange(base = "ETH", quote = "PHP") {
  const fallbackSpot = Number(process.env.BASE_FALLBACK_ETH_PHP || 210000);
  const fallbackBuy = Number(process.env.BASE_FALLBACK_ETH_PHP_BUY || (fallbackSpot * 1.005).toFixed(2));
  const fallbackSell = Number(process.env.BASE_FALLBACK_ETH_PHP_SELL || (fallbackSpot * 0.995).toFixed(2));

  return {
    ok: true,
    mode: "fallback",
    base,
    quote,
    pair: `${base}-${quote}`,
    source: "Configured fallback wallet exchange",
    rates: {
      buy: fallbackBuy,
      sell: fallbackSell,
      spot: fallbackSpot
    },
    generatedAt: new Date().toISOString()
  };
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function renderPage(pageKey) {
  return (req, res) => {
    const page = pages[pageKey];

    res.render("layout", {
      site: siteData,
      page,
      pages,
      currentPage: pageKey,
      serializedData: JSON.stringify(siteData),
      pageMeta: buildPageMeta(req, page),
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

app.get("/api/v1/wallet-exchange", async (req, res) => {
  const base = String(req.query.base || "ETH").toUpperCase();
  const quote = String(req.query.quote || "PHP").toUpperCase();

  try {
    const payload = await getCoinbaseWalletExchange(base, quote);
    res.json(payload);
  } catch (_error) {
    res.json(buildFallbackWalletExchange(base, quote));
  }
});

app.get("/.well-known/farcaster.json", (req, res) => {
  res.json(buildMiniAppManifest(req));
});

app.get("/api/v1/locations", async (_req, res) => {
  const directory = await getPhilippineLocationDirectoryWithFallback();

  res.json({
    ok: true,
    country: directory.country || "PH",
    generatedAt: directory.generatedAt || new Date().toISOString(),
    defaultLocation: siteData.locationDefaults.selectedLocation,
    locations: directory.locations,
    taxonomy: directory.taxonomy
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`GrainWatch listening on http://localhost:${port}`);
  });
}

module.exports = app;
