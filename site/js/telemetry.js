(function () {
    const connectionString = window.APPINSIGHTS_CONNECTION_STRING;

    if (!connectionString) {
        return;
    }

    const script = document.createElement("script");
    script.src = "https://js.monitor.azure.com/scripts/b/ai.3.gbl/ai.min.js";
    script.onload = function () {
        const appInsights = new Microsoft.ApplicationInsights.ApplicationInsights({
            config: {
                connectionString,
                enableAutoRouteTracking: true
            }
        });

        appInsights.loadAppInsights();
        appInsights.trackPageView();
    };
    document.head.appendChild(script);
})();
