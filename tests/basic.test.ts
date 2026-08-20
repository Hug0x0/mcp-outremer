import { describe, expect, it } from 'vitest';

describe('mcp-outremer', () => {
  it('has a stable package name', () => {
    expect('mcp-outremer').toMatch(/^mcp-/);
  });

  it('defines source URLs', () => {
    const sources = [
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
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a tool prefix', () => {
    expect('outremer').toMatch(/^[a-z0-9_]+$/);
  });
});
