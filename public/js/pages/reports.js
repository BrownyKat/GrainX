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

function createVolatilityBarGradient(context, topColor, bottomColor) {
  const chart = context.chart;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return bottomColor;
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

function createProjectionLineGradient(chart, topColor, bottomColor) {
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return bottomColor;
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

function projectionChartOptions(minY, tickFormatter) {
  return {
    ...reportsApp.chartOptions(minY, tickFormatter),
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        align: "start",
        labels: {
          color: "#91a0b8",
          usePointStyle: true,
          pointStyle: "line",
          boxWidth: 32,
          padding: 16,
          font: { family: "IBM Plex Mono", size: 11 }
        }
      },
      tooltip: {
        ...reportsApp.chartOptions().plugins.tooltip,
        displayColors: true,
        padding: 12,
        callbacks: {
          title(items) {
            return items[0]?.label || "";
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color(context) {
            return context.index === 29 ? "rgba(104, 164, 255, 0.35)" : "rgba(145, 160, 184, 0.08)";
          },
          lineWidth(context) {
            return context.index === 29 ? 1.4 : 1;
          },
          drawTicks: false
        },
        border: { display: false },
        ticks: {
          color: "#91a0b8",
          font: { family: "IBM Plex Mono", size: 10 },
          maxRotation: 50,
          minRotation: 50,
          callback(value, index, ticks) {
            const label = this.getLabelForValue(value);
            if (index === 29) return "Today";
            if (index === 30) return "F+1";
            return index % 2 === 0 ? label : "";
          }
        }
      },
      y: {
        min: minY,
        border: { display: false },
        grid: {
          color: "rgba(145, 160, 184, 0.12)",
          drawBorder: false
        },
        ticks: {
          color: "#91a0b8",
          font: { family: "IBM Plex Mono", size: 10 },
          callback: tickFormatter
        }
      }
    }
  };
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
      {
        label: `${primaryCommodity.name} historical`,
        data: primaryProjection.historical,
        borderColor: "#23d5ab",
        backgroundColor(context) {
          return createProjectionLineGradient(context.chart, "rgba(35, 213, 171, 0.20)", "rgba(35, 213, 171, 0.01)");
        },
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.38,
        borderWidth: 2.4
      },
      {
        label: `${primaryCommodity.name} forecast`,
        data: primaryProjection.forecast,
        borderColor: "#8b5cf6",
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.38,
        borderWidth: 2.2,
        borderDash: [6, 6]
      }
    ]
  },
  options: projectionChartOptions(
    chartMin(primaryProjection.historical, primaryProjection.forecast),
    (value) => `${value}`
  )
});

new Chart(document.getElementById("wheatForecastChart"), {
  type: "line",
  data: {
    labels: secondaryProjection.labels,
    datasets: [
      {
        label: `${secondaryCommodity.name} historical`,
        data: secondaryProjection.historical,
        borderColor: "#60a5fa",
        backgroundColor(context) {
          return createProjectionLineGradient(context.chart, "rgba(96, 165, 250, 0.20)", "rgba(96, 165, 250, 0.01)");
        },
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.38,
        borderWidth: 2.4
      },
      {
        label: `${secondaryCommodity.name} forecast`,
        data: secondaryProjection.forecast,
        borderColor: "#f59e0b",
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.38,
        borderWidth: 2.2,
        borderDash: [6, 6]
      }
    ]
  },
  options: projectionChartOptions(
    chartMin(secondaryProjection.historical, secondaryProjection.forecast),
    (value) => `${value}`
  )
});

new Chart(document.getElementById("volatilityChart"), {
  type: "bar",
  data: {
    labels: reportsData.commodities.map((commodity) => commodity.name),
    datasets: [
      {
        label: "Monthly move",
        data: reportsData.commodities.map((commodity) => Math.abs(commodity.monthlyChange)),
        backgroundColor(context) {
          const fills = [
            ["rgba(35, 213, 171, 0.48)", "rgba(35, 213, 171, 0.12)"],
            ["rgba(96, 165, 250, 0.46)", "rgba(96, 165, 250, 0.12)"],
            ["rgba(245, 158, 11, 0.44)", "rgba(245, 158, 11, 0.12)"],
            ["rgba(139, 92, 246, 0.44)", "rgba(139, 92, 246, 0.12)"]
          ];
          const [topColor, bottomColor] = fills[context.dataIndex] || fills[0];
          return createVolatilityBarGradient(context, topColor, bottomColor);
        },
        borderColor: ["#23d5ab", "#60a5fa", "#f59e0b", "#8b5cf6"],
        borderWidth: 2,
        borderRadius: 18,
        borderSkipped: false,
        hoverBorderWidth: 2,
        barPercentage: 0.72,
        categoryPercentage: 0.78
      }
    ]
  },
  options: {
    ...reportsApp.chartOptions(0, (value) => `${value}%`),
    interaction: { mode: "nearest", intersect: true },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...reportsApp.chartOptions().plugins.tooltip,
        displayColors: false,
        callbacks: {
          title(items) {
            return items[0]?.label || "";
          },
          label(item) {
            return `Monthly move: ${item.formattedValue}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: {
          color: "#91a0b8",
          font: { family: "IBM Plex Mono", size: 11 },
          maxRotation: 0
        }
      },
      y: {
        min: 0,
        suggestedMax: 4.5,
        border: { display: false },
        grid: {
          color: "rgba(145, 160, 184, 0.18)",
          drawBorder: false
        },
        ticks: {
          stepSize: 0.5,
          color: "#91a0b8",
          font: { family: "IBM Plex Mono", size: 10 },
          callback(value) {
            return `${value}%`;
          }
        }
      }
    }
  }
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
