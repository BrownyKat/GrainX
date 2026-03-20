function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} for ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPxMetadata(baseUrl, tablePath) {
  return fetchJson(`${trimTrailingSlash(baseUrl)}/${tablePath}`);
}

async function queryPxTable(baseUrl, tablePath, body) {
  return fetchJson(`${trimTrailingSlash(baseUrl)}/${tablePath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function getVariables(metadata) {
  return metadata.variables || metadata?.dataset?.variables || [];
}

function listVariableValues(variable) {
  if (!variable) return [];

  const values = variable.values || [];
  const texts = variable.valueTexts || [];

  return values.map((value, index) => ({
    code: value,
    label: texts[index] || value
  }));
}

function findVariable(metadata, patterns) {
  const variables = getVariables(metadata);

  return variables.find((variable) => {
    const haystack = `${variable.code || ""} ${variable.text || ""}`.toLowerCase();
    return patterns.some((pattern) => pattern.test(haystack));
  });
}

function pickValue(variable, matchers) {
  const values = listVariableValues(variable);

  return values.find((entry) =>
    matchers.some((matcher) => matcher.test(`${entry.code} ${entry.label}`))
  );
}

function pickLatestValues(variable, count = 1) {
  const values = listVariableValues(variable);
  return values.slice(Math.max(0, values.length - count));
}

function pickFirstValue(variable) {
  return listVariableValues(variable)[0] || null;
}

function buildSelection(variable, values) {
  return {
    code: variable.code,
    selection: {
      filter: "item",
      values: values.map((entry) => entry.code)
    }
  };
}

function resolveDataset(payload) {
  return payload.dataset || payload;
}

function orderedCategoryKeys(category) {
  if (Array.isArray(category.index)) return category.index;

  return Object.entries(category.index || {})
    .sort((left, right) => left[1] - right[1])
    .map(([key]) => key);
}

function rowsFromJsonStat(payload) {
  const dataset = resolveDataset(payload);
  const ids = dataset.id || Object.keys(dataset.dimension || {});
  const dimensions = ids.map((id) => {
    const dimension = dataset.dimension[id] || {};
    const category = dimension.category || {};
    const keys = orderedCategoryKeys(category);

    return {
      id,
      keys,
      labels: category.label || {}
    };
  });

  const totalSize = dimensions.reduce((product, dimension) => product * dimension.keys.length, 1);
  const values = dataset.value || [];
  const rows = [];

  for (let flatIndex = 0; flatIndex < totalSize; flatIndex += 1) {
    let remainder = flatIndex;
    const row = {};

    for (let dimensionIndex = dimensions.length - 1; dimensionIndex >= 0; dimensionIndex -= 1) {
      const dimension = dimensions[dimensionIndex];
      const keyCount = dimension.keys.length;
      const position = remainder % keyCount;
      remainder = Math.floor(remainder / keyCount);
      const code = dimension.keys[position];

      row[dimension.id] = {
        code,
        label: dimension.labels[code] || code
      };
    }

    row.value = values[flatIndex] ?? null;
    rows.push(row);
  }

  return rows;
}

module.exports = {
  buildSelection,
  escapeRegex,
  fetchPxMetadata,
  findVariable,
  getVariables,
  listVariableValues,
  pickFirstValue,
  pickLatestValues,
  pickValue,
  queryPxTable,
  rowsFromJsonStat
};
