import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiRequest, API_BASE_URL } from './useApiData';

describe('API data transport', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  it('uses the configured base URL and bearer token', async () => {
    localStorage.setItem('catlx_api_token', 'jwt-token');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([{ id: 'p1' }]), { status: 200 }));

    await apiRequest('/projects');

    expect(API_BASE_URL).toBe(`${window.location.protocol}//${window.location.hostname}:8099/api`);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options?.headers as Headers).get('Authorization')).toBe('Bearer jwt-token');
  });

  it('throws the API error and does not silently accept failed responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'Nope' }), { status: 401 }));
    await expect(apiRequest('/projects')).rejects.toThrow('Nope');
  });
});
