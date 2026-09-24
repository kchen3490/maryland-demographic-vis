# Maryland Demographic Visualization

This data visualization pulls US Census Bureau data on Maryland's racial demographics and then displays the data utilizing d3.js

## Process 🪄✨
1) I designed the web app using Figma. I designed with fidelity and kept the user convenience in mind. ([Figma design]([url](https://www.figma.com/design/g0poBgxffrRvWY4zHTL4NW/maryland-demographics?node-id=0-1&t=TlwFuMNRX9DhGpJc-1)))
2) I pulled the US Census Bureau data using their freely-distributed API key. I used Python scripts to do so.
3) I created the d3.js visualization. I used html, css, and js files to create the visualization.
4) The site can be deployed to Azure Static Web Apps with GitHub Actions.
5) Application Insights can collect page visits and client-side telemetry.

## Azure deployment

1. Create an Azure Static Web App and an Application Insights resource.
2. Add these GitHub repository secrets:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: the deployment token from the Static Web App.
   - `APPINSIGHTS_CONNECTION_STRING`: the connection string from Application Insights.
   - `API_KEY`: the US Census Bureau API key, if the data-fetching workflow is enabled.
3. Push to `main` or `master`. The workflow in
   `.github/workflows/azure-static-web-apps.yml` deploys the contents of `site/`.
4. In Application Insights, use **Usage > Users, Sessions, and Events** to track
   visits and **Logs** for detailed page-view queries.

The generated Azure hostname is used in the canonical URL, Open Graph metadata,
`robots.txt`, and `sitemap.xml`. If a custom domain is added, replace
`maryland-demographic-vis.azurestaticapps.net` in those files with that domain
and submit the sitemap to Google Search Console and Bing Webmaster Tools.

### Census API key

The Census key is used only by `scripts/fetch_census.py` when refreshing the
source data. The script first checks the `API_KEY` environment variable and
falls back to the local `.env` file for development. `.env` is ignored by Git
and must not be committed.

In GitHub, add the key under **Settings > Secrets and variables > Actions** as
the repository secret `API_KEY`. GitHub Actions will only use that secret if a
workflow explicitly passes it as an environment variable, for example:

```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
```

The current Azure deployment workflow does not fetch Census data; it deploys
the already-generated files in `site/`. Do not put the Census key in the
website, `site/`, HTML, JavaScript, or any public workflow output. If the key
has ever been committed or shared publicly, revoke it and create a replacement
before adding it to GitHub.
