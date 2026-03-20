const alertsApp = window.GrainWatchApp;
const activeAlerts = alertsApp.data.alertHistory.filter((alert) => alert.state === "Active").length;
const resolvedAlerts = alertsApp.data.alertHistory.filter((alert) => alert.state === "Resolved").length;

alertsApp.updateFooterStatus(`Last update: ${activeAlerts} active alerts, ${resolvedAlerts} resolved Philippine cases`);
