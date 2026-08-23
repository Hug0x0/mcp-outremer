# mcp-outremer

MCP server for French overseas territories public-data discovery and official source navigation.

## Scope

French overseas territories data discovery across national portals and local open-data portals.

## Tools

- `outremer_get_sources`
- `outremer_search_data_gouv`
- `outremer_get_dataset`
- `outremer_fetch_source_excerpt`
- `outremer_explain_scope`
- `outremer_list_reference_items`
- `outremer_list_territories`
- `outremer_get_territory`
- `outremer_list_communes`
- `outremer_search_territory_datasets`
- `outremer_compare_departments`

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "outremer": {
      "command": "npx",
      "args": ["mcp-outremer"]
    }
  }
}
```

## Sources

- data.gouv.fr: https://www.data.gouv.fr/
- data.gouv.fr API reference: https://doc.data.gouv.fr/api/reference/
- geo.api.gouv.fr: https://geo.api.gouv.fr/
- La Réunion open data: https://data.regionreunion.com/
- New Caledonia open data: https://data.gouv.nc/
- Météo-France Outre-mer: https://meteofrance.re/

## Example Prompts

- "Search national datasets about overseas territories."
- "Find official data portals for La Réunion, Mayotte, and New Caledonia."
- "Explain which national APIs can resolve overseas commune codes."

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. For emergency, legal, or administrative decisions, follow the competent public service.

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Publishing notes: [`docs/publishing.md`](docs/publishing.md).

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## License

MIT
