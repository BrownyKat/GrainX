const { buildPhilippineLocationTaxonomy, normalizePhilippineMarketLocation } = require("./ph-location-taxonomy");

const baseNetwork = {
  key: "sepolia",
  chainName: "Base Sepolia",
  chainId: 84532,
  chainHex: "0x14a34",
  rpcUrl: "https://sepolia.base.org",
  explorerUrl: "https://sepolia-explorer.base.org"
};

const siteData = {
  meta: {
    brand: "GrainWatch PH",
    tagline: "Philippine grains market terminal for rice and corn price intelligence.",
    summary:
      "A Philippines-only market terminal with quoted grain prices, city-level comparison, forward views, and a Base-ready attestation desk for rice and corn operations.",
    release: "v3.0 Market Terminal",
    refreshLabel: "Snapshot refreshes every 15 minutes",
    footerNote: "Market-terminal MVP with modular EJS views, per-page Tailwind sources, official-source API routes, and a Base-ready wallet attestation workflow.",
    focus: "Philippines",
    timezone: "Asia/Manila"
  },
  reportCharts: {
    primaryKey: "regularRice",
    secondaryKey: "yellowCorn",
    primaryGrowthStep: 0.18,
    secondaryGrowthStep: 0.08
  },
  commodities: [
    {
      key: "specialRice",
      symbol: "SR",
      name: "Special Rice",
      benchmark: "Supermarket premium",
      value: 63.5,
      weeklyChange: 0.5,
      monthlyChange: 1.2,
      threshold: 65.0,
      signal: "Premium stable",
      confidence: 92,
      sparkline: [62.8, 62.9, 63.0, 63.1, 63.2, 63.3, 63.4, 63.4, 63.5, 63.5]
    },
    {
      key: "premiumRice",
      symbol: "PR",
      name: "Premium Rice",
      benchmark: "Urban retail average",
      value: 58.2,
      weeklyChange: 0.9,
      monthlyChange: 2.1,
      threshold: 60.0,
      signal: "Rising demand",
      confidence: 90,
      sparkline: [57.1, 57.3, 57.5, 57.6, 57.8, 57.9, 58.0, 58.1, 58.2, 58.2]
    },
    {
      key: "regularRice",
      symbol: "RR",
      name: "Regular-Milled Rice",
      benchmark: "National retail composite",
      value: 47.9,
      weeklyChange: 1.4,
      monthlyChange: 3.8,
      threshold: 48.5,
      signal: "Near consumer ceiling",
      confidence: 89,
      sparkline: [46.1, 46.2, 46.4, 46.6, 46.9, 47.1, 47.3, 47.5, 47.7, 47.9]
    },
    {
      key: "wellMilledRice",
      symbol: "WR",
      name: "Well-Milled Rice",
      benchmark: "Urban retail composite",
      value: 52.6,
      weeklyChange: 1.1,
      monthlyChange: 3.1,
      threshold: 53.5,
      signal: "Freight-sensitive",
      confidence: 86,
      sparkline: [50.8, 51.1, 51.3, 51.5, 51.7, 51.9, 52.0, 52.2, 52.4, 52.6]
    },
    {
      key: "yellowCorn",
      symbol: "YC",
      name: "Yellow Corn",
      benchmark: "Mindanao farmgate composite",
      value: 23.8,
      weeklyChange: 0.8,
      monthlyChange: 2.4,
      threshold: 24.5,
      signal: "Feed mill watch",
      confidence: 82,
      sparkline: [22.7, 22.8, 22.9, 23.0, 23.2, 23.3, 23.4, 23.6, 23.7, 23.8]
    },
    {
      key: "whiteCorn",
      symbol: "WC",
      name: "White Corn",
      benchmark: "Farmgate delivery average",
      value: 15.7,
      weeklyChange: -0.6,
      monthlyChange: -1.8,
      threshold: 16.5,
      signal: "Procurement window",
      confidence: 79,
      sparkline: [16.2, 16.1, 16.0, 15.9, 15.9, 15.8, 15.8, 15.7, 15.7, 15.7]
    }
  ],
  labels30: [
    "2/20",
    "2/21",
    "2/22",
    "2/23",
    "2/24",
    "2/25",
    "2/26",
    "2/27",
    "2/28",
    "3/1",
    "3/2",
    "3/3",
    "3/4",
    "3/5",
    "3/6",
    "3/7",
    "3/8",
    "3/9",
    "3/10",
    "3/11",
    "3/12",
    "3/13",
    "3/14",
    "3/15",
    "3/16",
    "3/17",
    "3/18",
    "3/19",
    "3/20",
    "3/21"
  ],
  history: {
    specialRice: [62.5, 62.6, 62.6, 62.7, 62.8, 62.9, 62.9, 63.0, 63.1, 63.1, 63.2, 63.2, 63.3, 63.3, 63.4, 63.4, 63.4, 63.4, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5, 63.5],
    premiumRice: [57.0, 57.1, 57.2, 57.2, 57.3, 57.4, 57.5, 57.5, 57.6, 57.6, 57.7, 57.8, 57.8, 57.9, 57.9, 58.0, 58.0, 58.0, 58.1, 58.1, 58.1, 58.2, 58.2, 58.2, 58.2, 58.2, 58.2, 58.2, 58.2, 58.2],
    regularRice: [45.9, 46.0, 46.0, 46.1, 46.2, 46.3, 46.3, 46.4, 46.5, 46.5, 46.6, 46.7, 46.8, 46.9, 47.0, 47.1, 47.1, 47.2, 47.3, 47.3, 47.4, 47.4, 47.5, 47.6, 47.7, 47.7, 47.8, 47.8, 47.9, 47.9],
    wellMilledRice: [50.2, 50.4, 50.5, 50.6, 50.7, 50.8, 50.9, 51.0, 51.2, 51.2, 51.3, 51.4, 51.5, 51.6, 51.7, 51.8, 51.9, 52.0, 52.0, 52.1, 52.2, 52.3, 52.3, 52.4, 52.5, 52.5, 52.5, 52.6, 52.6, 52.6],
    yellowCorn: [22.1, 22.2, 22.3, 22.3, 22.4, 22.4, 22.5, 22.6, 22.7, 22.7, 22.8, 22.8, 22.9, 23.0, 23.0, 23.1, 23.2, 23.2, 23.3, 23.3, 23.4, 23.5, 23.5, 23.6, 23.7, 23.7, 23.8, 23.8, 23.8, 23.8],
    whiteCorn: [16.3, 16.2, 16.2, 16.1, 16.1, 16.0, 16.0, 15.9, 15.9, 15.9, 15.8, 15.8, 15.8, 15.7, 15.7, 15.7, 15.6, 15.6, 15.6, 15.6, 15.6, 15.6, 15.7, 15.7, 15.7, 15.7, 15.7, 15.7, 15.7, 15.7]
  },
  predictions: [
    {
      commodity: "Special Rice",
      current: 63.5,
      forecast: 63.8,
      delta: "+0.3",
      confidence: "92%",
      signal: "Stable premium"
    },
    {
      commodity: "Regular-Milled Rice",
      current: 47.9,
      forecast: 48.6,
      delta: "+0.7",
      confidence: "89%",
      signal: "Watch threshold"
    },
    {
      commodity: "Well-Milled Rice",
      current: 52.6,
      forecast: 53.2,
      delta: "+0.6",
      confidence: "86%",
      signal: "Freight pressure"
    },
    {
      commodity: "Yellow Corn",
      current: 23.8,
      forecast: 24.1,
      delta: "+0.3",
      confidence: "82%",
      signal: "Feed exposure"
    },
    {
      commodity: "White Corn",
      current: 15.7,
      forecast: 15.5,
      delta: "-0.2",
      confidence: "79%",
      signal: "Softer buying"
    }
  ],
  activities: [
    { timestamp: "14:32:01", commodity: "Regular-Milled Rice", index: 47.9, change: "+0.21%", status: "Up", region: "NCR" },
    { timestamp: "14:28:44", commodity: "Well-Milled Rice", index: 52.6, change: "+0.14%", status: "Up", region: "Metro Cebu" },
    { timestamp: "14:22:11", commodity: "Yellow Corn", index: 23.8, change: "+0.08%", status: "Firm", region: "Bukidnon" },
    { timestamp: "14:17:55", commodity: "White Corn", index: 15.7, change: "-0.13%", status: "Soft", region: "Ilocos Norte" },
    { timestamp: "14:10:03", commodity: "Regular-Milled Rice", index: 47.8, change: "+0.18%", status: "Rising", region: "Iloilo City" },
    { timestamp: "14:05:22", commodity: "Yellow Corn", index: 23.7, change: "+0.11%", status: "Rising", region: "Cagayan de Oro" }
  ],
  reportHighlights: [
    {
      title: "Official Source Mode",
      value: "Enabled",
      detail: "Dashboard content is aligned with Philippine grain categories and can sync to PSA OpenSTAT through the new API layer."
    },
    {
      title: "Retail Watch",
      value: "Rice-led",
      detail: "Consumer pressure remains concentrated in regular and well-milled rice bands."
    },
    {
      title: "Feed Exposure",
      value: "Contained",
      detail: "Yellow corn is firm but still below the current watch threshold for feed operations."
    },
    {
      title: "Integration Ready",
      value: "API v1",
      detail: "Normalized JSON endpoints are available for live price sync, source catalog, and alert evaluation."
    }
  ],
  reportTable: [
    {
      title: "Regular rice retail watch",
      summary: "Regular-milled rice is close to the consumer watch threshold in NCR and nearby urban markets.",
      recommendation: "Prepare escalation",
      risk: "High"
    },
    {
      title: "Well-milled rice freight check",
      summary: "Freight and warehouse transfers remain the main upside risk for better-quality rice.",
      recommendation: "Monitor logistics",
      risk: "Medium"
    },
    {
      title: "Yellow corn feed cover",
      summary: "Mindanao farmgate prices are steady, but feed mills should watch freight and import substitution.",
      recommendation: "Monitor",
      risk: "Medium"
    },
    {
      title: "White corn procurement",
      summary: "Soft pricing still supports measured procurement for food-use channels.",
      recommendation: "Consider buy",
      risk: "Low"
    }
  ],
  marketRows: [
    {
      key: "specialRice",
      symbol: "SR",
      commodity: "Special Rice",
      exchange: "Supermarket / Premium",
      spot: 63.5,
      dailyChange: "+0.05",
      weekly: "+0.5%",
      low: 62.5,
      high: 64.0,
      settlement: "Premium retail check",
      region: "Metro Manila / Cebu",
      leadLocation: "Makati City"
    },
    {
      key: "premiumRice",
      symbol: "PR",
      commodity: "Premium Rice",
      exchange: "Urban retail board",
      spot: 58.2,
      dailyChange: "+0.12",
      weekly: "+0.9%",
      low: 57.0,
      high: 59.5,
      settlement: "Trader release check",
      region: "NCR / Central Luzon",
      leadLocation: "Quezon City"
    },
    {
      key: "regularRice",
      symbol: "RR",
      commodity: "Regular-Milled Rice",
      exchange: "NCR retail board",
      spot: 47.9,
      dailyChange: "+0.22",
      weekly: "+1.4%",
      low: 47.4,
      high: 48.2,
      settlement: "Retail validation",
      region: "NCR / CALABARZON",
      leadLocation: "Quezon City"
    },
    {
      key: "wellMilledRice",
      symbol: "WR",
      commodity: "Well-Milled Rice",
      exchange: "Urban market composite",
      spot: 52.6,
      dailyChange: "+0.18",
      weekly: "+1.1%",
      low: 52.1,
      high: 53.0,
      settlement: "Warehouse release check",
      region: "Metro Manila / Cebu",
      leadLocation: "Cebu City"
    },
    {
      key: "yellowCorn",
      symbol: "YC",
      commodity: "Yellow Corn",
      exchange: "Bukidnon farmgate",
      spot: 23.8,
      dailyChange: "+0.09",
      weekly: "+0.8%",
      low: 23.4,
      high: 24.2,
      settlement: "Mill contract check",
      region: "Northern Mindanao",
      leadLocation: "Cagayan de Oro"
    },
    {
      key: "whiteCorn",
      symbol: "WC",
      commodity: "White Corn",
      exchange: "Northern Luzon farmgate",
      spot: 15.7,
      dailyChange: "-0.04",
      weekly: "-0.6%",
      low: 15.5,
      high: 16.0,
      settlement: "Trader receipt check",
      region: "Ilocos / Cagayan Valley",
      leadLocation: "Urdaneta City"
    }
  ],
  regions: [
    {
      region: "National Capital Region",
      label: "+2.4%",
      intensity: 84,
      status: "Hot",
      detail: "Retail rice pressure is highest here, especially for regular-milled rice in public markets."
    },
    {
      region: "Central Luzon",
      label: "+1.7%",
      intensity: 63,
      status: "Warm",
      detail: "Warehouse releases help, but replenishment into NCR still needs close monitoring."
    },
    {
      region: "Western Visayas",
      label: "+1.3%",
      intensity: 52,
      status: "Warm",
      detail: "Rice movement is steady, though inter-island freight remains a risk point."
    },
    {
      region: "Northern Mindanao",
      label: "+0.9%",
      intensity: 47,
      status: "Cool",
      detail: "Yellow corn remains firm but below the current alert ceiling for feed buyers."
    },
    {
      region: "Cagayan Valley",
      label: "-0.4%",
      intensity: 24,
      status: "Cold",
      detail: "White corn pricing is still soft enough to support procurement."
    },
    {
      region: "BARMM",
      label: "+2.0%",
      intensity: 71,
      status: "Hot",
      detail: "Rice access and logistics remain sensitive to disruptions and delivery slippage."
    }
  ],
  recommendedFunction: {
    title: "Procurement Planner",
    description: "Estimate buying cost by city, compare it with the national benchmark, and see where procurement is more efficient or more exposed.",
    benefit: "This turns price monitoring into a concrete operator decision: buy, wait, or escalate."
  },
  locationDefaults: {
    selectedLocation: "Urdaneta City"
  },
  locationMarkets: [
    {
      slug: "urdaneta-city",
      location: "Urdaneta City",
      region: "Pangasinan",
      officialGeolocation: "Pangasinan",
      source: "Pilot city price board + provincial validation",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "A1 corridor / central wholesale pull",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.5, unit: "PHP/kg", variance: -1.0 },
        { key: "premiumRice", name: "Premium Rice", price: 57.0, unit: "PHP/kg", variance: -1.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.1, unit: "PHP/kg", variance: -0.8 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.8, unit: "PHP/kg", variance: -0.8 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.2, unit: "PHP/kg", variance: 0.4 },
        { key: "whiteCorn", name: "White Corn", price: 15.5, unit: "PHP/kg", variance: -0.2 }
      ]
    },
    {
      slug: "laoag-city",
      location: "Laoag City",
      region: "Ilocos Region",
      officialGeolocation: "Ilocos Norte",
      source: "Northern trade post",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Road transport / North hub",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.2, unit: "PHP/kg", variance: -0.3 },
        { key: "premiumRice", name: "Premium Rice", price: 58.0, unit: "PHP/kg", variance: -0.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.5, unit: "PHP/kg", variance: -0.4 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.2, unit: "PHP/kg", variance: -0.4 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.5, unit: "PHP/kg", variance: 0.7 },
        { key: "whiteCorn", name: "White Corn", price: 16.0, unit: "PHP/kg", variance: 0.3 }
      ]
    },
    {
      slug: "quezon-city",
      location: "Quezon City",
      region: "National Capital Region",
      officialGeolocation: "National Capital Region",
      source: "Urban retail board",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Metro demand center",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 64.2, unit: "PHP/kg", variance: 0.7 },
        { key: "premiumRice", name: "Premium Rice", price: 59.1, unit: "PHP/kg", variance: 0.9 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 48.4, unit: "PHP/kg", variance: 0.5 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 53.2, unit: "PHP/kg", variance: 0.6 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.3, unit: "PHP/kg", variance: 0.5 },
        { key: "whiteCorn", name: "White Corn", price: 15.9, unit: "PHP/kg", variance: 0.2 }
      ]
    },
    {
      slug: "manila-city",
      location: "Manila City",
      region: "National Capital Region",
      officialGeolocation: "National Capital Region",
      source: "Port area wholesale",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "International port hub",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 64.0, unit: "PHP/kg", variance: 0.5 },
        { key: "premiumRice", name: "Premium Rice", price: 58.9, unit: "PHP/kg", variance: 0.7 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 48.1, unit: "PHP/kg", variance: 0.2 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 53.0, unit: "PHP/kg", variance: 0.4 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.6, unit: "PHP/kg", variance: 0.8 },
        { key: "whiteCorn", name: "White Corn", price: 16.5, unit: "PHP/kg", variance: 0.8 }
      ]
    },
    {
      slug: "iloilo-city",
      location: "Iloilo City",
      region: "Western Visayas",
      officialGeolocation: "Iloilo",
      source: "Regional market watch",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Inter-island rice lane",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.0, unit: "PHP/kg", variance: -0.5 },
        { key: "premiumRice", name: "Premium Rice", price: 58.0, unit: "PHP/kg", variance: -0.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.6, unit: "PHP/kg", variance: -0.3 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.1, unit: "PHP/kg", variance: -0.5 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.0, unit: "PHP/kg", variance: 0.2 },
        { key: "whiteCorn", name: "White Corn", price: 15.7, unit: "PHP/kg", variance: 0.0 }
      ]
    },
    {
      slug: "bacolod-city",
      location: "Bacolod City",
      region: "Western Visayas",
      officialGeolocation: "Negros Occidental",
      source: "Sugar/Rice trade composite",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Port access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.9, unit: "PHP/kg", variance: -0.6 },
        { key: "premiumRice", name: "Premium Rice", price: 57.9, unit: "PHP/kg", variance: -0.3 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.7, unit: "PHP/kg", variance: -0.2 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.3, unit: "PHP/kg", variance: -0.3 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.1, unit: "PHP/kg", variance: 0.3 },
        { key: "whiteCorn", name: "White Corn", price: 15.8, unit: "PHP/kg", variance: 0.1 }
      ]
    },
    {
      slug: "puerto-princesa",
      location: "Puerto Princesa",
      region: "MIMAROPA",
      officialGeolocation: "Palawan",
      source: "Island market watch",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Sea freight dependent",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 65.5, unit: "PHP/kg", variance: 2.0 },
        { key: "premiumRice", name: "Premium Rice", price: 60.0, unit: "PHP/kg", variance: 1.8 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 49.5, unit: "PHP/kg", variance: 1.6 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 54.5, unit: "PHP/kg", variance: 1.9 },
        { key: "yellowCorn", name: "Yellow Corn", price: 25.8, unit: "PHP/kg", variance: 2.0 },
        { key: "whiteCorn", name: "White Corn", price: 17.0, unit: "PHP/kg", variance: 1.3 }
      ]
    },
    {
      slug: "cebu-city",
      location: "Cebu City",
      region: "Central Visayas",
      officialGeolocation: "Cebu",
      source: "Urban market watch",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Port-led distribution",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.8, unit: "PHP/kg", variance: 0.3 },
        { key: "premiumRice", name: "Premium Rice", price: 58.5, unit: "PHP/kg", variance: 0.3 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 48.0, unit: "PHP/kg", variance: 0.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.9, unit: "PHP/kg", variance: 0.3 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.1, unit: "PHP/kg", variance: 0.3 },
        { key: "whiteCorn", name: "White Corn", price: 15.8, unit: "PHP/kg", variance: 0.1 }
      ]
    },
    {
      slug: "baguio-city",
      location: "Baguio City",
      region: "Cordillera Administrative Region",
      officialGeolocation: "Benguet",
      source: "Highland trade post",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Mountain trail access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 64.5, unit: "PHP/kg", variance: 1.0 },
        { key: "premiumRice", name: "Premium Rice", price: 59.2, unit: "PHP/kg", variance: 1.0 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 49.0, unit: "PHP/kg", variance: 1.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 54.0, unit: "PHP/kg", variance: 1.4 },
        { key: "yellowCorn", name: "Yellow Corn", price: 25.5, unit: "PHP/kg", variance: 1.7 },
        { key: "whiteCorn", name: "White Corn", price: 16.8, unit: "PHP/kg", variance: 1.1 }
      ]
    },
    {
      slug: "tuguegarao-city",
      location: "Tuguegarao City",
      region: "Cagayan Valley",
      officialGeolocation: "Cagayan",
      source: "Valley trade center",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "River/Road junction",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.0, unit: "PHP/kg", variance: -1.5 },
        { key: "premiumRice", name: "Premium Rice", price: 56.5, unit: "PHP/kg", variance: -1.7 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 46.5, unit: "PHP/kg", variance: -1.4 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.0, unit: "PHP/kg", variance: -1.6 },
        { key: "yellowCorn", name: "Yellow Corn", price: 22.5, unit: "PHP/kg", variance: -1.3 },
        { key: "whiteCorn", name: "White Corn", price: 14.8, unit: "PHP/kg", variance: -0.9 }
      ]
    },
    {
      slug: "cabanatuan-city",
      location: "Cabanatuan City",
      region: "Central Luzon",
      officialGeolocation: "Nueva Ecija",
      source: "Rice granary capital",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Major milling hub",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 61.5, unit: "PHP/kg", variance: -2.0 },
        { key: "premiumRice", name: "Premium Rice", price: 56.0, unit: "PHP/kg", variance: -2.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 46.0, unit: "PHP/kg", variance: -1.9 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 50.5, unit: "PHP/kg", variance: -2.1 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.5, unit: "PHP/kg", variance: -0.3 },
        { key: "whiteCorn", name: "White Corn", price: 15.2, unit: "PHP/kg", variance: -0.5 }
      ]
    },
    {
      slug: "davao-city",
      location: "Davao City",
      region: "Davao Region",
      officialGeolocation: "Davao del Sur",
      source: "Mindanao trade hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Southern port corridor",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.8, unit: "PHP/kg", variance: -0.7 },
        { key: "premiumRice", name: "Premium Rice", price: 57.5, unit: "PHP/kg", variance: -0.7 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.0, unit: "PHP/kg", variance: -0.9 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.5, unit: "PHP/kg", variance: -1.1 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.2, unit: "PHP/kg", variance: -0.6 },
        { key: "whiteCorn", name: "White Corn", price: 15.2, unit: "PHP/kg", variance: -0.5 }
      ]
    },
    {
      slug: "tagum-city",
      location: "Tagum City",
      region: "Davao Region",
      officialGeolocation: "Davao del Norte",
      source: "Agri-trade center",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Pan-Philippine Highway",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.6, unit: "PHP/kg", variance: -0.9 },
        { key: "premiumRice", name: "Premium Rice", price: 57.3, unit: "PHP/kg", variance: -0.9 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 46.8, unit: "PHP/kg", variance: -1.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.3, unit: "PHP/kg", variance: -1.3 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.0, unit: "PHP/kg", variance: -0.8 },
        { key: "whiteCorn", name: "White Corn", price: 15.0, unit: "PHP/kg", variance: -0.7 }
      ]
    },
    {
      slug: "zamboanga-city",
      location: "Zamboanga City",
      region: "Zamboanga Peninsula",
      officialGeolocation: "Zamboanga del Sur",
      source: "Western Mindanao market",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Peninsula port access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.2, unit: "PHP/kg", variance: -0.3 },
        { key: "premiumRice", name: "Premium Rice", price: 57.8, unit: "PHP/kg", variance: -0.4 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.5, unit: "PHP/kg", variance: -0.4 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.0, unit: "PHP/kg", variance: -0.6 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.8, unit: "PHP/kg", variance: 0.0 },
        { key: "whiteCorn", name: "White Corn", price: 15.6, unit: "PHP/kg", variance: -0.1 }
      ]
    },
    {
      slug: "legazpi-city",
      location: "Legazpi City",
      region: "Bicol Region",
      officialGeolocation: "Albay",
      source: "South Luzon composite",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Nautical highway link",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.0, unit: "PHP/kg", variance: -0.5 },
        { key: "premiumRice", name: "Premium Rice", price: 57.8, unit: "PHP/kg", variance: -0.4 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.2, unit: "PHP/kg", variance: -0.7 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.9, unit: "PHP/kg", variance: -0.7 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.0, unit: "PHP/kg", variance: 0.2 },
        { key: "whiteCorn", name: "White Corn", price: 15.9, unit: "PHP/kg", variance: 0.2 }
      ]
    },
    {
      slug: "naga-city",
      location: "Naga City",
      region: "Bicol Region",
      officialGeolocation: "Camarines Sur",
      source: "Bicol river basin hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Central Bicol access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.8, unit: "PHP/kg", variance: -0.7 },
        { key: "premiumRice", name: "Premium Rice", price: 57.5, unit: "PHP/kg", variance: -0.7 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.0, unit: "PHP/kg", variance: -0.9 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.7, unit: "PHP/kg", variance: -0.9 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.9, unit: "PHP/kg", variance: 0.1 },
        { key: "whiteCorn", name: "White Corn", price: 15.8, unit: "PHP/kg", variance: 0.1 }
      ]
    },
    {
      slug: "tacloban-city",
      location: "Tacloban City",
      region: "Eastern Visayas",
      officialGeolocation: "Leyte",
      source: "Eastern Visayas hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Inter-island bridge link",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.4, unit: "PHP/kg", variance: -0.1 },
        { key: "premiumRice", name: "Premium Rice", price: 58.0, unit: "PHP/kg", variance: -0.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.8, unit: "PHP/kg", variance: -0.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.5, unit: "PHP/kg", variance: -0.1 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.2, unit: "PHP/kg", variance: 0.4 },
        { key: "whiteCorn", name: "White Corn", price: 16.0, unit: "PHP/kg", variance: 0.3 }
      ]
    },
    {
      slug: "general-santos-city",
      location: "General Santos City",
      region: "SOCCSKSARGEN",
      officialGeolocation: "South Cotabato",
      source: "Southern port composite",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Agri-industrial port",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.7, unit: "PHP/kg", variance: -0.8 },
        { key: "premiumRice", name: "Premium Rice", price: 57.3, unit: "PHP/kg", variance: -0.9 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 46.9, unit: "PHP/kg", variance: -1.0 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.4, unit: "PHP/kg", variance: -1.2 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.0, unit: "PHP/kg", variance: -0.8 },
        { key: "whiteCorn", name: "White Corn", price: 15.0, unit: "PHP/kg", variance: -0.7 }
      ]
    },
    {
      slug: "batangas-city",
      location: "Batangas City",
      region: "CALABARZON",
      officialGeolocation: "Batangas",
      source: "Southern Tagalog hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "International port access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 64.0, unit: "PHP/kg", variance: 0.5 },
        { key: "premiumRice", name: "Premium Rice", price: 58.8, unit: "PHP/kg", variance: 0.6 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 48.2, unit: "PHP/kg", variance: 0.3 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 53.0, unit: "PHP/kg", variance: 0.4 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.5, unit: "PHP/kg", variance: 0.7 },
        { key: "whiteCorn", name: "White Corn", price: 16.2, unit: "PHP/kg", variance: 0.5 }
      ]
    },
    {
      slug: "lucena-city",
      location: "Lucena City",
      region: "CALABARZON",
      officialGeolocation: "Quezon",
      source: "Coconut/Rice trade mix",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Rail/Port junction",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.6, unit: "PHP/kg", variance: 0.1 },
        { key: "premiumRice", name: "Premium Rice", price: 58.2, unit: "PHP/kg", variance: 0.0 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.9, unit: "PHP/kg", variance: 0.0 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.6, unit: "PHP/kg", variance: 0.0 },
        { key: "yellowCorn", name: "Yellow Corn", price: 24.2, unit: "PHP/kg", variance: 0.4 },
        { key: "whiteCorn", name: "White Corn", price: 16.0, unit: "PHP/kg", variance: 0.3 }
      ]
    },
    {
      slug: "cotabato-city",
      location: "Cotabato City",
      region: "BARMM",
      officialGeolocation: "Maguindanao",
      source: "Regional center",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "River port",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.5, unit: "PHP/kg", variance: 0.0 },
        { key: "premiumRice", name: "Premium Rice", price: 58.0, unit: "PHP/kg", variance: -0.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.8, unit: "PHP/kg", variance: -0.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.4, unit: "PHP/kg", variance: -0.2 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.6, unit: "PHP/kg", variance: -0.2 },
        { key: "whiteCorn", name: "White Corn", price: 15.5, unit: "PHP/kg", variance: -0.2 }
      ]
    },
    {
      slug: "malaybalay-city",
      location: "Malaybalay City",
      region: "Northern Mindanao",
      officialGeolocation: "Bukidnon",
      source: "Corn/Rice upland hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Mindanao central highway",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 62.5, unit: "PHP/kg", variance: -1.0 },
        { key: "premiumRice", name: "Premium Rice", price: 57.0, unit: "PHP/kg", variance: -1.2 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 46.8, unit: "PHP/kg", variance: -1.1 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.5, unit: "PHP/kg", variance: -1.1 },
        { key: "yellowCorn", name: "Yellow Corn", price: 22.8, unit: "PHP/kg", variance: -1.0 },
        { key: "whiteCorn", name: "White Corn", price: 14.9, unit: "PHP/kg", variance: -0.8 }
      ]
    },
    {
      slug: "butuan-city",
      location: "Butuan City",
      region: "Caraga",
      officialGeolocation: "Agusan del Norte",
      source: "Caraga regional hub",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "River/Road access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.3, unit: "PHP/kg", variance: -0.2 },
        { key: "premiumRice", name: "Premium Rice", price: 57.9, unit: "PHP/kg", variance: -0.3 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.4, unit: "PHP/kg", variance: -0.5 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 52.0, unit: "PHP/kg", variance: -0.6 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.9, unit: "PHP/kg", variance: 0.1 },
        { key: "whiteCorn", name: "White Corn", price: 15.6, unit: "PHP/kg", variance: -0.1 }
      ]
    },
    {
      slug: "cagayan-de-oro",
      location: "Cagayan de Oro",
      region: "Northern Mindanao",
      officialGeolocation: "Misamis Oriental",
      source: "Farmgate and mill desk composite",
      updatedAt: "2026-03-20T14:25:00+08:00",
      logistics: "Mill and port access",
      grains: [
        { key: "specialRice", name: "Special Rice", price: 63.1, unit: "PHP/kg", variance: -0.4 },
        { key: "premiumRice", name: "Premium Rice", price: 57.9, unit: "PHP/kg", variance: -0.3 },
        { key: "regularRice", name: "Regular-Milled Rice", price: 47.3, unit: "PHP/kg", variance: -0.6 },
        { key: "wellMilledRice", name: "Well-Milled Rice", price: 51.9, unit: "PHP/kg", variance: -0.7 },
        { key: "yellowCorn", name: "Yellow Corn", price: 23.4, unit: "PHP/kg", variance: -0.4 },
        { key: "whiteCorn", name: "White Corn", price: 15.6, unit: "PHP/kg", variance: -0.1 }
      ]
    }
  ],
  deskCommentary: [
    {
      title: "Regular rice remains the price leader",
      summary: "NCR retail pricing still anchors the national board, while Urdaneta and Iloilo continue to trade below the Manila band."
    },
    {
      title: "Yellow corn is firm but not yet stretched",
      summary: "Northern Mindanao remains the key reference for yellow corn, with city spreads still manageable for feed desks."
    },
    {
      title: "White corn still favors measured buying",
      summary: "Northern Luzon and Pangasinan prices remain soft enough to support procurement without forcing aggressive replenishment."
    }
  ],
  marketSignals: [
    {
      label: "Top Premium",
      value: "Quezon City +0.5",
      detail: "Quezon City regular rice still trades above the national benchmark."
    },
    {
      label: "Best Buy Zone",
      value: "Urdaneta City",
      detail: "Urdaneta remains one of the cheaper boards for regular and well-milled rice."
    },
    {
      label: "Base Mode",
      value: process.env.BASE_ATTESTATION_CONTRACT ? "Contract-ready" : "Signature-ready",
      detail: `The attestation desk uses Coinbase Wallet on ${baseNetwork.chainName} for grain ticket signing.`
    }
  ],
  alerts: [
    {
      type: "critical",
      title: "Regular-milled rice watch",
      description:
        "Regular-milled rice is nearing the 48.5 consumer threshold. NCR operators should validate with retail checks and stock movement reports before the next cycle.",
      meta: "Triggered 08:40 PHT | Severity: Critical | Owner: NCR Retail Desk"
    },
    {
      type: "warning",
      title: "Well-milled rice freight pressure",
      description:
        "Well-milled rice remains below threshold, but freight and warehouse delays are keeping the premium segment under pressure.",
      meta: "Triggered 06:15 PHT | Severity: Warning | Owner: Logistics Desk"
    },
    {
      type: "info",
      title: "White corn procurement window",
      description:
        "White corn remains below the buy threshold, creating a favorable procurement window for food-use channels.",
      meta: "Triggered 03:20 PHT | Severity: Info | Owner: Northern Luzon Sourcing"
    }
  ],
  alertHistory: [
    {
      date: "2026-03-20",
      commodity: "Regular-Milled Rice",
      trigger: "Retail threshold watch (48.5)",
      value: 47.9,
      owner: "NCR Retail Desk",
      state: "Active",
      resolution: "Still open. Waiting for official retail validation and 2 safe refresh cycles before closure."
    },
    {
      date: "2026-03-18",
      commodity: "Well-Milled Rice",
      trigger: "Freight-led rise",
      value: 52.9,
      owner: "Logistics Desk",
      state: "Resolved",
      resolution: "Closed after warehouse releases normalized deliveries and the next 2 updates stayed below the warning band."
    },
    {
      date: "2026-03-12",
      commodity: "Yellow Corn",
      trigger: "Feed mill pressure",
      value: 24.6,
      owner: "Mindanao Feed Desk",
      state: "Resolved",
      resolution: "Closed after inbound supply was confirmed and farmgate readings moved back below threshold."
    },
    {
      date: "2026-03-08",
      commodity: "White Corn",
      trigger: "Procurement opportunity",
      value: 15.6,
      owner: "Northern Luzon Sourcing",
      state: "Resolved",
      resolution: "Closed after buyers logged purchases and the market stabilized within the expected operating band."
    }
  ],
  alertProcess: [
    {
      step: "01",
      title: "Ingest",
      description: "The platform pulls grain readings from official Philippine source tables and internal monitoring rules.",
      outcome: "Current live integration targets PSA OpenSTAT cereals tables with normalized JSON output."
    },
    {
      step: "02",
      title: "Validate",
      description: "Operators compare the move against official release timing, regional checks, and any supporting local field reports.",
      outcome: "The alert stays open if the movement is confirmed by source data and local context."
    },
    {
      step: "03",
      title: "Assign",
      description: "A responsible desk takes ownership, such as NCR Retail, Logistics, or Mindanao Feed.",
      outcome: "Ownership is required before the issue can move toward closure."
    },
    {
      step: "04",
      title: "Act",
      description: "The team responds with retail checks, warehouse release coordination, procurement timing, or logistics follow-up.",
      outcome: "The action note becomes part of the audit trail and can be exported or signed."
    },
    {
      step: "05",
      title: "Resolve",
      description: "The alert closes only after the metric returns inside the threshold band for two straight refresh cycles.",
      outcome: "If the value remains elevated or the action note is incomplete, the alert stays active."
    },
    {
      step: "06",
      title: "Monitor",
      description: "Closed incidents stay on watch for the next 24 hours to catch repeat breaches.",
      outcome: "Repeat incidents can be reopened with the previous case context attached."
    }
  ],
  resolutionRules: [
    "The triggering grain metric must return inside the configured threshold band.",
    "A named desk owner must log what action was taken and when it happened.",
    "The safe state must hold for two consecutive refresh cycles before closure.",
    "The grain stays on watch for 24 hours after resolution."
  ],
  oracle: {
    latestBlock: 21934567,
    feedBadge: "Simulated Chainlink / PH Grain Desk",
    primaryHistoryFeed: "PH REGULARRICE / KG",
    metrics: [
      { label: "Official Source Feeds", value: "4", caption: "Rice and corn categories normalized into one Philippine grain dashboard." },
      { label: "Watcher Nodes", value: "18", caption: "Watchers checking official-source drift, threshold breaches, and stale snapshots." },
      { label: "Open Incidents", value: "1", caption: "One active Philippine retail case still in review." },
      { label: "Signed Receipts", value: "48", caption: "Incident proofs available for audit and workflow review." }
    ],
    feeds: [
      { feed: "PH REGULARRICE / KG", price: 47.9, roundId: 18884, block: 21934567, nodes: "7/7", heartbeat: "32s", contract: "0x7f4D...A91c" },
      { feed: "PH WELLMILLED / KG", price: 52.6, roundId: 18885, block: 21934564, nodes: "7/7", heartbeat: "54s", contract: "0x24Ab...98e2" },
      { feed: "PH YELLOWCORN / KG", price: 23.8, roundId: 18886, block: 21934561, nodes: "7/7", heartbeat: "1m", contract: "0x8C11...b77F" },
      { feed: "PH WHITECORN / KG", price: 15.7, roundId: 18887, block: 21934559, nodes: "7/7", heartbeat: "1m", contract: "0xB321...19dC" }
    ],
    rounds: [
      { roundId: 18887, feed: "PH WHITECORN / KG", price: 15.7, block: 21934559, age: "1m", status: "Confirmed" },
      { roundId: 18886, feed: "PH YELLOWCORN / KG", price: 23.8, block: 21934561, age: "1m", status: "Confirmed" },
      { roundId: 18885, feed: "PH WELLMILLED / KG", price: 52.6, block: 21934564, age: "54s", status: "Confirmed" },
      { roundId: 18884, feed: "PH REGULARRICE / KG", price: 47.9, block: 21934567, age: "32s", status: "Confirmed" },
      { roundId: 18883, feed: "PH REGULARRICE / KG", price: 47.8, block: 21934521, age: "2m", status: "Confirmed" },
      { roundId: 18882, feed: "PH YELLOWCORN / KG", price: 23.7, block: 21934497, age: "3m", status: "Confirmed" }
    ],
    contracts: [
      { feed: "PH REGULARRICE / KG", address: "0x7f4D...A91c", decimals: 8, heartbeat: "60m", nodes: 7 },
      { feed: "PH WELLMILLED / KG", address: "0x24Ab...98e2", decimals: 8, heartbeat: "60m", nodes: 7 },
      { feed: "PH YELLOWCORN / KG", address: "0x8C11...b77F", decimals: 8, heartbeat: "60m", nodes: 7 },
      { feed: "PH WHITECORN / KG", address: "0xB321...19dC", decimals: 8, heartbeat: "60m", nodes: 7 }
    ],
    chainLog: [
      { type: "oracle", hash: "0x91f0ab34", description: "latestRoundData() verified for PH REGULARRICE / KG", block: 21934567, age: "Just now" },
      { type: "update", hash: "0x18cd9f12", description: "Retail desk watcher pushed PH WELLMILLED confirmation", block: 21934564, age: "54s ago" },
      { type: "alert", hash: "0xa4510fe2", description: "Regular rice watch receipt queued for signature", block: 21934562, age: "1m ago" },
      { type: "oracle", hash: "0x37b2c911", description: "Consensus reached across 7 PH grain watcher nodes", block: 21934559, age: "1m ago" },
      { type: "update", hash: "0x7ceab4d9", description: "Source freshness check completed for official grain tables", block: 21934552, age: "2m ago" }
    ],
    supportedChains: [baseNetwork.chainName],
    timeline: [
      { time: "14:30 PHT", title: "Regular rice receipt queued", description: "The latest regular-milled rice case bundle is ready for wallet signature." },
      { time: "14:18 PHT", title: "Official source sync checked", description: "PSA-backed feed assumptions were refreshed for the latest integration window." },
      { time: "13:54 PHT", title: "Oracle heartbeat received", description: "The PH grain reference feeds refreshed from the watcher cluster." }
    ]
  },
  baseDesk: {
    title: "Base Grain Ticket",
    description: "Create a Base Sepolia market attestation from a selected grain, city, action, and quantity, then sign it with Coinbase Wallet as an auditable operator ticket.",
    uniqueValue: "This is the feature the reference market page does not have: a typed-data grain ticket tied to Base and a live wallet workflow.",
    preferredChain: baseNetwork.chainName,
    networkKey: baseNetwork.key,
    chainId: baseNetwork.chainId,
    chainHex: baseNetwork.chainHex,
    rpcUrl: process.env.BASE_RPC_URL || baseNetwork.rpcUrl,
    explorerUrl: process.env.BASE_EXPLORER_URL || baseNetwork.explorerUrl,
    walletInstallUrl: process.env.BASE_WALLET_INSTALL_URL || "https://www.coinbase.com/wallet",
    contractAddress: process.env.BASE_ATTESTATION_CONTRACT || "",
    mode: process.env.BASE_ATTESTATION_CONTRACT ? "Contract-ready" : "Signature-ready",
    expiryMinutes: 30,
    supportedActions: ["BUY", "WATCH", "HOLD"]
  },
  settings: {
    thresholds: {
      specialRice: 65.0,
      premiumRice: 60.0,
      regularRice: 48.5,
      wellMilledRice: 53.5,
      yellowCorn: 24.5,
      whiteCorn: 16.5
    },
    notifications: [
      { label: "In-app alerts", description: "Show operational prompts for rice and corn desks inside the app.", enabled: true },
      { label: "Email digest", description: "Send a source summary after each official data refresh window.", enabled: true },
      { label: "Webhook to ERP", description: "Push normalized grain alerts to external systems through the API layer.", enabled: false }
    ],
    dataSources: [
      { source: "PSA OpenSTAT", type: "Retail cereals API (Table 0042M4ARN01)", latency: "Monthly release", status: "Primary" },
      { source: "PSA OpenSTAT", type: "Farmgate cereals API (Table 0032M4AFN01)", latency: "Monthly release", status: "Primary" },
      { source: "PSA OpenSTAT", type: "Rice and corn stocks table (Table 0032E4ECNV0)", latency: "Monthly release", status: "Optional" },
      { source: "DA Price Watch", type: "Daily validation board", latency: "Daily", status: "Advisory" }
    ],
    apiRoutes: [
      {
        method: "GET",
        path: "/api/v1/grains/live",
        purpose: "Fetch normalized live grain data from official Philippine sources.",
        source: "PSA OpenSTAT"
      },
      {
        method: "GET",
        path: "/api/v1/grains/live?geolocation=Philippines&periods=6",
        purpose: "Get the last N periods for a selected geography using the same normalized schema.",
        source: "PSA OpenSTAT"
      },
      {
        method: "GET",
        path: "/api/v1/alerts/evaluate",
        purpose: "Evaluate the latest live readings against configured grain thresholds.",
        source: "App rule engine"
      },
      {
        method: "GET",
        path: "/api/v1/integration",
        purpose: "List active source tables and route catalog for external implementation.",
        source: "App integration catalog"
      },
      {
        method: "GET",
        path: "/api/v1/locations",
        purpose: "List supported pilot locations and their official geolocation mappings.",
        source: "App location catalog"
      },
      {
        method: "GET",
        path: "/api/v1/location-prices?location=Urdaneta%20City",
        purpose: "Fetch current grain prices for a selected location with official-source fallback.",
        source: "Pilot city board + PSA mapping"
      },
      {
        method: "GET",
        path: "/api/v1/base/config",
        purpose: "Return Base chain, explorer, and attestation mode config for the wallet desk.",
        source: "App Base configuration"
      },
      {
        method: "GET",
        path: "/api/v1/wallet-exchange?base=ETH&quote=PHP",
        purpose: "Return the current Coinbase wallet exchange snapshot used by the paper trading desk.",
        source: "Coinbase Price API"
      }
    ],
    engine: {
      mode: "Official API + fallback snapshot",
      refreshInterval: "15 minutes",
      predictions: true,
      sensitivity: 2,
      confidenceScores: true
    }
  }
};

siteData.locationMarkets = siteData.locationMarkets.map(normalizePhilippineMarketLocation);
siteData.phLocationTaxonomy = buildPhilippineLocationTaxonomy(siteData.locationMarkets);

module.exports = siteData;
