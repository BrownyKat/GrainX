const siteData = require("../data/site");
const { withCache } = require("./cache");
const {
  cleanLabel,
  formatLocalityName,
  getCanonicalProvince,
  getCanonicalRegion,
  normalizeComparableLocalityName
} = require("../data/ph-location-taxonomy");

const PSGC_BASE_URL = process.env.PSGC_BASE_URL || "https://psgc.cloud/api/v2";
const LOCATION_CACHE_TTL_MS = Number(process.env.PH_LOCATION_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const NCR_REGION = "National Capital Region (NCR)";
const NCR_PROVINCE = "Metro Manila";

function slugify(value) {
  return cleanLabel(value)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function getRegionKey(value) {
  return cleanLabel(value).toLowerCase();
}

function getProvinceKey(value) {
  return cleanLabel(value).toLowerCase();
}

function getLocationKey(region, province, locality) {
  return [getRegionKey(region), getProvinceKey(province), normalizeComparableLocalityName(locality)].join("::");
}

function getLocationKeyWithoutProvince(region, locality) {
  return [getRegionKey(region), normalizeComparableLocalityName(locality)].join("::");
}

function getOfficialGeolocation(region, province, marketLocation) {
  if (marketLocation?.officialGeolocation) return marketLocation.officialGeolocation;
  if (region === NCR_REGION) return "National Capital Region";
  return province;
}

function normalizeApiRegionName(name) {
  return getCanonicalRegion(cleanLabel(name), "");
}

function normalizeApiProvinceName(region, province) {
  if (region === NCR_REGION) return NCR_PROVINCE;
  return getCanonicalProvince(cleanLabel(province), region);
}

function getLocationTypeLabel(type) {
  if (String(type || "").toLowerCase() === "mun") return "Municipality";
  if (String(type || "").toLowerCase() === "city") return "City";
  if (String(type || "").toLowerCase() === "submun") return "Sub-Municipality";
  return cleanLabel(type);
}

function buildMarketIndex() {
  const strict = new Map();
  const loose = new Map();

  siteData.locationMarkets.forEach((location) => {
    strict.set(getLocationKey(location.region, location.province, location.location), location);
    loose.set(getLocationKeyWithoutProvince(location.region, location.location), location);
  });

  return { strict, loose };
}

async function fetchJson(pathname) {
  const response = await fetch(`${PSGC_BASE_URL}${pathname}`);
  if (!response.ok) {
    throw new Error(`PH location request failed with ${response.status} for ${pathname}`);
  }

  return response.json();
}

function buildFallbackLocationDirectory() {
  const locations = siteData.locationMarkets.map((location) => ({
    country: "PH",
    region: location.region,
    province: location.province,
    city: location.location,
    location: location.location,
    slug: location.slug,
    type: "City",
    code: location.slug,
    district: "",
    zipCode: "",
    officialGeolocation: location.officialGeolocation,
    source: location.source,
    updatedAt: location.updatedAt,
    logistics: location.logistics,
    hasPilotMarket: true
  }));

  return {
    country: "PH",
    generatedAt: new Date().toISOString(),
    taxonomy: siteData.phLocationTaxonomy,
    locations
  };
}

async function getPhilippineLocationDirectory() {
  return withCache("ph-location-directory:v2", LOCATION_CACHE_TTL_MS, async () => {
    const regionPayload = await fetchJson("/regions");
    const regions = Array.isArray(regionPayload?.data) ? regionPayload.data : [];
    const marketIndex = buildMarketIndex();

    const regionBundles = await Promise.all(
      regions.map(async (regionEntry) => {
        const encodedRegionName = encodeURIComponent(regionEntry.name);
        const [provincePayload, localityPayload] = await Promise.all([
          fetchJson(`/regions/${encodedRegionName}/provinces`),
          fetchJson(`/regions/${encodedRegionName}/cities-municipalities`)
        ]);

        return {
          code: regionEntry.code,
          region: normalizeApiRegionName(regionEntry.name),
          provinces: Array.isArray(provincePayload?.data) ? provincePayload.data : [],
          localities: Array.isArray(localityPayload?.data) ? localityPayload.data : []
        };
      })
    );

    const taxonomy = [];
    const locationDirectory = [];
    const seenLocationKeys = new Set();

    regionBundles.forEach((bundle) => {
      const provinceMap = new Map();

      bundle.provinces.forEach((provinceEntry) => {
        const province = normalizeApiProvinceName(bundle.region, provinceEntry.name);
        provinceMap.set(province, {
          province,
          code: provinceEntry.code,
          hasPilotCity: false
        });
      });

      if (bundle.region === NCR_REGION && !provinceMap.size) {
        provinceMap.set(NCR_PROVINCE, {
          province: NCR_PROVINCE,
          code: bundle.code,
          hasPilotCity: false
        });
      }

      bundle.localities
        .filter((locality) => String(locality.type || "").toLowerCase() !== "submun")
        .forEach((locality) => {
          const province = normalizeApiProvinceName(bundle.region, locality.province);
          const formattedLocation = formatLocalityName(locality.name, locality.type);
          const marketLocation =
            marketIndex.strict.get(getLocationKey(bundle.region, province, formattedLocation)) ||
            marketIndex.loose.get(getLocationKeyWithoutProvince(bundle.region, formattedLocation)) ||
            null;
          const displayLocation = marketLocation?.location || formattedLocation;
          const locationKey = getLocationKey(bundle.region, province, displayLocation);

          if (seenLocationKeys.has(locationKey)) return;
          seenLocationKeys.add(locationKey);

          if (!provinceMap.has(province)) {
            provinceMap.set(province, {
              province,
              code: province,
              hasPilotCity: false
            });
          }

          if (marketLocation) {
            provinceMap.get(province).hasPilotCity = true;
          }

          locationDirectory.push({
            country: "PH",
            region: bundle.region,
            province,
            city: displayLocation,
            location: displayLocation,
            slug: marketLocation?.slug || slugify(displayLocation),
            type: getLocationTypeLabel(locality.type),
            code: locality.code,
            district: cleanLabel(locality.district),
            zipCode: cleanLabel(locality.zip_code),
            officialGeolocation: getOfficialGeolocation(bundle.region, province, marketLocation),
            source: marketLocation?.source || "Philippine Standard Geographic Code (PSGC)",
            updatedAt: marketLocation?.updatedAt || null,
            logistics: marketLocation?.logistics || `Official ${province} reference`,
            hasPilotMarket: Boolean(marketLocation)
          });
        });

      taxonomy.push({
        code: bundle.code,
        region: bundle.region,
        provinces: [...provinceMap.values()].sort((left, right) => left.province.localeCompare(right.province, "en", { sensitivity: "base" }))
      });
    });

    return {
      country: "PH",
      generatedAt: new Date().toISOString(),
      taxonomy,
      locations: locationDirectory.sort((left, right) => {
        if (left.region !== right.region) return left.region.localeCompare(right.region, "en", { sensitivity: "base" });
        if (left.province !== right.province) return left.province.localeCompare(right.province, "en", { sensitivity: "base" });
        return left.location.localeCompare(right.location, "en", { sensitivity: "base" });
      })
    };
  });
}

async function getPhilippineLocationDirectoryWithFallback() {
  try {
    return await getPhilippineLocationDirectory();
  } catch (_error) {
    return buildFallbackLocationDirectory();
  }
}

async function findPhilippineLocation(query) {
  const directory = await getPhilippineLocationDirectoryWithFallback();
  const normalizedQuery = normalizeComparableLocalityName(query);

  return (
    directory.locations.find((location) => normalizeComparableLocalityName(location.location) === normalizedQuery) ||
    directory.locations.find((location) => cleanLabel(location.slug).toLowerCase() === cleanLabel(query).toLowerCase()) ||
    null
  );
}

module.exports = {
  findPhilippineLocation,
  getPhilippineLocationDirectory,
  getPhilippineLocationDirectoryWithFallback
};
