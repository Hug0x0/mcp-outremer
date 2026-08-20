#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-outremer",
  "prefix": "outremer",
  "title": "Outre-mer",
  "description": "MCP server for French overseas territories public-data discovery and official source navigation.",
  "domain": "French overseas territories data discovery across national portals and local open-data portals.",
  "sources": [
    {
      "title": "data.gouv.fr",
      "url": "https://www.data.gouv.fr/"
    },
    {
      "title": "data.gouv.fr API reference",
      "url": "https://doc.data.gouv.fr/api/reference/"
    },
    {
      "title": "geo.api.gouv.fr",
      "url": "https://geo.api.gouv.fr/"
    },
    {
      "title": "La Réunion open data",
      "url": "https://data.regionreunion.com/"
    },
    {
      "title": "New Caledonia open data",
      "url": "https://data.gouv.nc/"
    },
    {
      "title": "Météo-France Outre-mer",
      "url": "https://meteofrance.re/"
    }
  ],
  "examples": [
    "Search national datasets about overseas territories.",
    "Find official data portals for La Réunion, Mayotte, and New Caledonia.",
    "Explain which national APIs can resolve overseas commune codes."
  ],
  "dataGouvDefaultQuery": "outre-mer",
  "localItems": []
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function htmlToText(html: string): string {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function sourceByKey(key: string) {
  const normalized = key.toLowerCase();
  return CONFIG.sources.find((source, index) =>
    String(index + 1) === normalized ||
    source.title.toLowerCase().includes(normalized) ||
    source.url.toLowerCase().includes(normalized)
  );
}

const TERRITORIES = [
  { name: 'Guadeloupe', code: '971', type: 'department-region', data_gouv_query: 'Guadeloupe', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Guadeloupe' },
  { name: 'Martinique', code: '972', type: 'department-region', data_gouv_query: 'Martinique', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Martinique' },
  { name: 'Guyane', code: '973', type: 'department-region', data_gouv_query: 'Guyane', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Guyane' },
  { name: 'La Réunion', code: '974', type: 'department-region', data_gouv_query: 'Réunion', portal: 'https://data.regionreunion.com/' },
  { name: 'Mayotte', code: '976', type: 'department-region', data_gouv_query: 'Mayotte', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Mayotte' },
  { name: 'Saint-Pierre-et-Miquelon', code: '975', type: 'collectivity', data_gouv_query: 'Saint-Pierre-et-Miquelon', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Saint-Pierre-et-Miquelon' },
  { name: 'Saint-Barthélemy', code: '977', type: 'collectivity', data_gouv_query: 'Saint-Barthélemy', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Saint-Barthélemy' },
  { name: 'Saint-Martin', code: '978', type: 'collectivity', data_gouv_query: 'Saint-Martin', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Saint-Martin' },
  { name: 'Wallis-et-Futuna', code: '986', type: 'collectivity', data_gouv_query: 'Wallis Futuna', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Wallis+Futuna' },
  { name: 'Polynésie française', code: '987', type: 'collectivity', data_gouv_query: 'Polynésie française', portal: 'https://www.data.gouv.fr/fr/datasets/?q=Polynésie+française' },
  { name: 'Nouvelle-Calédonie', code: '988', type: 'collectivity', data_gouv_query: 'Nouvelle-Calédonie', portal: 'https://data.gouv.nc/' },
] as const;

function findTerritory(value: string) {
  const normalized = value.toLowerCase();
  return TERRITORIES.find((territory) =>
    territory.code === normalized ||
    territory.name.toLowerCase().includes(normalized) ||
    territory.data_gouv_query.toLowerCase().includes(normalized)
  );
}

const server = new McpServer({
  name: CONFIG.name,
  version: '0.1.0',
});

server.tool(
  `${CONFIG.prefix}_get_sources`,
  `List curated official and high-value sources for ${CONFIG.title}.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    domain: CONFIG.domain,
    sources: CONFIG.sources,
    examples: CONFIG.examples,
  })
);

server.tool(
  `${CONFIG.prefix}_search_data_gouv`,
  'Search public datasets on data.gouv.fr using the official public API.',
  {
    query: z.string().default(CONFIG.dataGouvDefaultQuery).describe('Search query.'),
    page_size: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ query, page_size }) => {
    try {
      const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', String(page_size));
      const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
      return jsonResult({
        query,
        total: data.total,
        datasets: (data.data ?? []).map((dataset) => ({
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          page: dataset.page,
          organization: typeof dataset.organization === 'object' && dataset.organization
            ? (dataset.organization as Record<string, unknown>).name
            : undefined,
          resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search data.gouv.fr');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_get_dataset`,
  'Inspect one data.gouv.fr dataset by slug or id using the official public API.',
  {
    dataset: z.string().describe('Dataset slug or id.'),
  },
  async ({ dataset }) => {
    try {
      const url = `https://www.data.gouv.fr/api/1/datasets/${encodeURIComponent(dataset)}/`;
      const data = await fetchJson<Record<string, unknown>>(url);
      return jsonResult({
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        page: data.page,
        tags: data.tags,
        resources: Array.isArray(data.resources)
          ? data.resources.slice(0, 25).map((resource) => ({
              id: resource.id,
              title: resource.title,
              type: resource.type,
              format: resource.format,
              url: resource.url,
              latest: resource.latest,
            }))
          : [],
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to inspect dataset');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from one curated source URL. Use source_key as a number, title keyword, or URL fragment from get_sources.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200).describe('Maximum excerpt length.'),
  },
  async ({ source_key, max_chars }) => {
    try {
      const source = sourceByKey(source_key);
      if (!source) {
        return errorResult(`Unknown source: ${source_key}`);
      }
      const html = await fetchText(source.url);
      return jsonResult({
        source,
        excerpt: htmlToText(html).slice(0, max_chars),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_explain_scope`,
  `Explain what this MCP is useful for and how an agent should combine its sources.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    useful_for: CONFIG.domain,
    recommended_flow: [
      'Start with get_sources to understand trusted sources.',
      'Use search_data_gouv for discoverable French public datasets.',
      'Use get_dataset for dataset/resource inspection.',
      'Use fetch_source_excerpt for human-readable official pages.',
      'Cite official sources and avoid presenting source discovery as emergency or legal advice.',
    ],
    limitations: [
      'This is a discovery and summarization MCP, not an official authority.',
      'Some portals are HTML pages and can change without notice.',
      'For emergencies or administrative decisions, follow the competent official service.',
    ],
  })
);

server.tool(
  `${CONFIG.prefix}_list_reference_items`,
  'List built-in reference items for this MCP, when available.',
  {},
  async () => jsonResult({
    items: CONFIG.localItems,
    count: CONFIG.localItems.length,
    note: CONFIG.localItems.length > 0
      ? 'These are lightweight reference hints, not a complete authoritative dataset.'
      : 'No local reference list is bundled yet. Use the source and dataset search tools.',
  })
);

server.tool(
  'outremer_list_territories',
  'List French overseas territories with INSEE department/collectivity codes and useful portal hints.',
  {},
  async () => jsonResult({
    territories: TERRITORIES,
    count: TERRITORIES.length,
  })
);

server.tool(
  'outremer_get_territory',
  'Resolve one French overseas territory by name or code and return public-data search hints.',
  {
    territory: z.string().describe('Territory name or code, e.g. "974", "Réunion", "Mayotte", "988".'),
  },
  async ({ territory }) => {
    const resolved = findTerritory(territory);
    if (!resolved) {
      return errorResult(`Unknown overseas territory: ${territory}`);
    }
    return jsonResult({
      territory: resolved,
      suggested_data_gouv_query: resolved.data_gouv_query,
      geo_api_communes_url: ['971', '972', '973', '974', '976'].includes(resolved.code)
        ? `https://geo.api.gouv.fr/departements/${resolved.code}/communes`
        : undefined,
    });
  }
);

server.tool(
  'outremer_list_communes',
  'List communes for an overseas department using geo.api.gouv.fr. Supports 971, 972, 973, 974 and 976.',
  {
    department_code: z.enum(['971', '972', '973', '974', '976']).describe('Overseas department code.'),
  },
  async ({ department_code }) => {
    try {
      const url = `https://geo.api.gouv.fr/departements/${department_code}/communes?fields=nom,code,codesPostaux,population,centre&format=json`;
      const communes = await fetchJson<Array<Record<string, unknown>>>(url);
      return jsonResult({
        department_code,
        count: communes.length,
        communes: communes.map((commune) => ({
          name: commune.nom,
          code: commune.code,
          postal_codes: commune.codesPostaux,
          population: commune.population,
          center: commune.centre,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to list overseas communes');
    }
  }
);

server.tool(
  'outremer_search_territory_datasets',
  'Search data.gouv.fr for datasets related to one French overseas territory.',
  {
    territory: z.string().describe('Territory name or code.'),
    topic: z.string().optional().describe('Optional topic added to the territory query, e.g. "transport", "risques", "éducation".'),
    page_size: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ territory, topic, page_size }) => {
    const resolved = findTerritory(territory);
    if (!resolved) {
      return errorResult(`Unknown overseas territory: ${territory}`);
    }
    try {
      const query = topic ? `${resolved.data_gouv_query} ${topic}` : resolved.data_gouv_query;
      const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', String(page_size));
      const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
      return jsonResult({
        territory: resolved,
        query,
        total: data.total,
        datasets: (data.data ?? []).map((dataset) => ({
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          page: dataset.page,
          organization: dataset.organization && typeof dataset.organization === 'object'
            ? (dataset.organization as Record<string, unknown>).name
            : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search territory datasets');
    }
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
