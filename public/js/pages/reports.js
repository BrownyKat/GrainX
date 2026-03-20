const reportsApp = window.GrainWatchApp;
const reportsData = reportsApp.data;

function createProjection(baseSeries, startValue, growthStep) {
  const forecast = [startValue];
  let current = startValue;

  for (let index = 0; index < 30; index += 1) {
    current += growthStep;
    forecast.push(Number(current.toFixed(2)));
  }

  return {
    labels: Array.from({ length: 61 }, (_, index) => `D${index - 30}`),
    historical: [...baseSeries.slice(-30), ...new Array(31).fill(null)],
    forecast: [...new Array(29).fill(null), ...forecast]
  };
}

function chartMin(...seriesGroups) {
  const values = seriesGroups.flat().filter((value) => typeof value === "number");
  return Math.max(0, Math.floor(Math.min(...values) * 0.92));
}

const primaryCommodity =
  reportsData.commodities.find((commodity) => commodity.key === reportsData.reportCharts.primaryKey) ||
  reportsData.commodities[0];
const secondaryCommodity =
  reportsData.commodities.find((commodity) => commodity.key === reportsData.reportCharts.secondaryKey) ||
  reportsData.commodities[1];

const primaryProjection = createProjection(
  reportsData.history[primaryCommodity.key],
  primaryCommodity.value,
  reportsData.reportCharts.primaryGrowthStep
);
const secondaryProjection = createProjection(
  reportsData.history[secondaryCommodity.key],
  secondaryCommodity.value,
  reportsData.reportCharts.secondaryGrowthStep
);

new Chart(document.getElementById("riceForecastChart"), {
  type: "line",
  data: {
    labels: primaryProjection.labels,
    datasets: [
      { label: `${primaryCommodity.name} historical`, data: primaryProjection.historical, borderColor: "#23d5ab", pointRadius: 0, tension: 0.35, borderWidth: 2 },
      { label: `${primaryCommodity.name} forecast`, data: primaryProjection.forecast, borderColor: "#8b5cf6", pointRadius: 0, tension: 0.35, borderWidth: 2, borderDash: [5, 5] }
    ]
  },
  options: reportsApp.chartOptions(chartMin(primaryProjection.historical, primaryProjection.forecast))
});

new Chart(document.getElementById("wheatForecastChart"), {
  type: "line",
  data: {
    labels: secondaryProjection.labels,
    datasets: [
      { label: `${secondaryCommodity.name} historical`, data: secondaryProjection.historical, borderColor: "#60a5fa", pointRadius: 0, tension: 0.35, borderWidth: 2 },
      { label: `${secondaryCommodity.name} forecast`, data: secondaryProjection.forecast, borderColor: "#f59e0b", pointRadius: 0, tension: 0.35, borderWidth: 2, borderDash: [5, 5] }
    ]
  },
  options: reportsApp.chartOptions(chartMin(secondaryProjection.historical, secondaryProjection.forecast))
});

new Chart(document.getElementById("volatilityChart"), {
  type: "bar",
  data: {
    labels: reportsData.commodities.map((commodity) => commodity.name),
    datasets: [
      {
        label: "Volatility %",
        data: reportsData.commodities.map((commodity) => Math.abs(commodity.monthlyChange)),
        backgroundColor: ["rgba(35, 213, 171, 0.35)", "rgba(96, 165, 250, 0.35)", "rgba(245, 158, 11, 0.35)", "rgba(139, 92, 246, 0.35)"],
        borderColor: ["#23d5ab", "#60a5fa", "#f59e0b", "#8b5cf6"],
        borderWidth: 1.5,
        borderRadius: 12
      }
    ]
  },
  options: reportsApp.chartOptions(0, (value) => `${value}%`)
});

document.getElementById("reportExportBtn")?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(reportsData.reportTable, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "grainwatch-ph-report.json";
  anchor.click();
  URL.revokeObjectURL(url);
  reportsApp.updateFooterStatus(`Last update: PH report exported at ${new Date().toLocaleTimeString("en-PH", { hour12: false })}`);
});
