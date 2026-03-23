const PH_REGION_TAXONOMY = [
  {
    code: "NCR",
    label: "National Capital Region (NCR)",
    provinces: ["Metro Manila"]
  },
  {
    code: "CAR",
    label: "Cordillera Administrative Region (CAR)",
    provinces: ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"]
  },
  {
    code: "Region I",
    label: "Region I (Ilocos Region)",
    provinces: ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"]
  },
  {
    code: "Region II",
    label: "Region II (Cagayan Valley)",
    provinces: ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"]
  },
  {
    code: "Region III",
    label: "Region III (Central Luzon)",
    provinces: ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"]
  },
  {
    code: "Region IV-A",
    label: "Region IV-A (CALABARZON)",
    provinces: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"]
  },
  {
    code: "Region IV-B",
    label: "Region IV-B (MIMAROPA)",
    provinces: ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"]
  },
  {
    code: "Region V",
    label: "Region V (Bicol Region)",
    provinces: ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"]
  },
  {
    code: "Region VI",
    label: "Region VI (Western Visayas)",
    provinces: ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"]
  },
  {
    code: "Region VII",
    label: "Region VII (Central Visayas)",
    provinces: ["Bohol", "Cebu", "Negros Oriental", "Siquijor"]
  },
  {
    code: "Region VIII",
    label: "Region VIII (Eastern Visayas)",
    provinces: ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"]
  },
  {
    code: "Region IX",
    label: "Region IX (Zamboanga Peninsula)",
    provinces: ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"]
  },
  {
    code: "Region X",
    label: "Region X (Northern Mindanao)",
    provinces: ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"]
  },
  {
    code: "Region XI",
    label: "Region XI (Davao Region)",
    provinces: ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"]
  },
  {
    code: "Region XII",
    label: "Region XII (SOCCSKSARGEN)",
    provinces: ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"]
  },
  {
    code: "Region XIII",
    label: "Region XIII (Caraga)",
    provinces: ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"]
  },
  {
    code: "BARMM",
    label: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
    provinces: ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"]
  }
];

const LEGACY_REGION_TO_LABEL = {
  "national capital region": "National Capital Region (NCR)",
  "cordillera administrative region": "Cordillera Administrative Region (CAR)",
  "ilocos region": "Region I (Ilocos Region)",
  "cagayan valley": "Region II (Cagayan Valley)",
  "central luzon": "Region III (Central Luzon)",
  calabarzon: "Region IV-A (CALABARZON)",
  mimaropa: "Region IV-B (MIMAROPA)",
  "bicol region": "Region V (Bicol Region)",
  "western visayas": "Region VI (Western Visayas)",
  "central visayas": "Region VII (Central Visayas)",
  "eastern visayas": "Region VIII (Eastern Visayas)",
  "zamboanga peninsula": "Region IX (Zamboanga Peninsula)",
  "northern mindanao": "Region X (Northern Mindanao)",
  "davao region": "Region XI (Davao Region)",
  soccsksargen: "Region XII (SOCCSKSARGEN)",
  caraga: "Region XIII (Caraga)",
  barmm: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)"
};

const PROVINCE_ALIASES = {
  "national capital region": "Metro Manila",
  ncr: "Metro Manila",
  "metro manila": "Metro Manila"
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s()-]/g, "")
    .replace(/\s+/g, " ");
}

function cleanLabel(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const provinceToRegion = new Map();
PH_REGION_TAXONOMY.forEach((region) => {
  region.provinces.forEach((province) => {
    provinceToRegion.set(normalizeKey(province), region.label);
  });
});

function getCanonicalProvince(value, fallbackRegion) {
  const normalizedValue = normalizeKey(value);
  if (PROVINCE_ALIASES[normalizedValue]) return PROVINCE_ALIASES[normalizedValue];

  if (provinceToRegion.has(normalizedValue)) {
    return PH_REGION_TAXONOMY.flatMap((region) => region.provinces).find((province) => normalizeKey(province) === normalizedValue) || cleanLabel(value);
  }

  if (normalizeKey(fallbackRegion) === "national capital region (ncr)") return "Metro Manila";
  return cleanLabel(value);
}

function getCanonicalRegion(value, province) {
  const normalizedRegion = normalizeKey(value);
  if (LEGACY_REGION_TO_LABEL[normalizedRegion]) return LEGACY_REGION_TO_LABEL[normalizedRegion];

  const provinceMatch = provinceToRegion.get(normalizeKey(province));
  if (provinceMatch) return provinceMatch;

  return cleanLabel(value);
}

function formatLocalityName(name, type) {
  const cleaned = cleanLabel(name);
  const withoutCityOf = cleaned.replace(/^city of\s+/i, "");

  if (/^city of\s+/i.test(cleaned)) {
    return `${withoutCityOf} City`.replace(/\s+/g, " ").trim();
  }

  if (String(type || "").toLowerCase() === "city" && !/\bcity$/i.test(cleaned)) {
    return `${cleaned} City`.replace(/\s+/g, " ").trim();
  }

  return cleaned;
}

function normalizeComparableLocalityName(name) {
  return normalizeKey(
    cleanLabel(name)
      .replace(/^city of\s+/i, "")
      .replace(/\bcity\b/gi, "")
      .replace(/^municipality of\s+/i, "")
  );
}

function normalizePhilippineMarketLocation(location = {}) {
  const rawProvince = location.province || location.officialGeolocation || location.region || "";
  const region = getCanonicalRegion(location.region, rawProvince);
  const province = getCanonicalProvince(rawProvince, region);

  return {
    ...location,
    country: "PH",
    region,
    province,
    city: location.city || location.location
  };
}

function buildPhilippineLocationTaxonomy(locationMarkets = []) {
  const normalizedMarkets = locationMarkets.map(normalizePhilippineMarketLocation);
  const regionOrder = new Map(PH_REGION_TAXONOMY.map((entry, index) => [entry.label, index]));
  const cityCounts = new Map();

  normalizedMarkets.forEach((location) => {
    const key = `${location.region}::${location.province}`;
    cityCounts.set(key, (cityCounts.get(key) || 0) + 1);
  });

  return PH_REGION_TAXONOMY.map((region) => ({
    code: region.code,
    region: region.label,
    provinces: region.provinces.map((province) => ({
      province,
      hasPilotCity: cityCounts.has(`${region.label}::${province}`)
    }))
  }))
    .sort((left, right) => (regionOrder.get(left.region) ?? 999) - (regionOrder.get(right.region) ?? 999));
}

module.exports = {
  PH_REGION_TAXONOMY,
  buildPhilippineLocationTaxonomy,
  cleanLabel,
  formatLocalityName,
  getCanonicalProvince,
  getCanonicalRegion,
  normalizeComparableLocalityName,
  normalizePhilippineMarketLocation
};
