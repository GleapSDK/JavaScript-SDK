/**
 * @jest-environment jsdom
 */
import Gleap, { GleapSession } from './Gleap';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// A checklist step starts a tour on another page: the SDK redirects to the tour's start URL
// and the tour starts there from the gleap_tour query param (#229004).
describe('Gleap.startProductTour redirect to the start URL', () => {
  const originalLocation = window.location;
  let configSpy;

  const startFrom = async (currentUrl, config) => {
    delete window.location;
    window.location = { href: currentUrl };
    configSpy = jest.spyOn(GleapSession.getInstance(), 'startProductTourConfig').mockResolvedValue(config);
    Gleap.startProductTour('tour-1', true);
    await flush();
    return new URL(window.location.href);
  };

  afterEach(() => {
    configSpy.mockRestore();
    window.location = originalLocation;
  });

  it('adds the tour params to a start URL that has no query', async () => {
    const target = await startFrom('https://app.example.com/home', {
      startURL: 'https://app.example.com/workspaces',
      baseURL: 'https://app.example.com/workspaces',
    });

    expect(target.pathname).toBe('/workspaces');
    expect(target.searchParams.get('gleap_tour')).toBe('tour-1');
    expect(target.searchParams.get('gleap_tour_delay')).toBe('1');
  });

  it('keeps the query of a start URL that already has one', async () => {
    const target = await startFrom('https://app.example.com/home', {
      startURL: 'https://app.example.com/workspaces?view=list',
      baseURL: 'https://app.example.com/workspaces?view=list',
    });

    expect(target.searchParams.get('view')).toBe('list');
    expect(target.searchParams.get('gleap_tour')).toBe('tour-1');
    expect(target.searchParams.get('gleap_tour_delay')).toBe('1');
  });

  it('keeps the hash of the start URL after the tour params', async () => {
    const target = await startFrom('https://app.example.com/home', {
      startURL: 'https://app.example.com/workspaces?view=list#board',
      baseURL: 'https://app.example.com/workspaces',
    });

    expect(target.searchParams.get('view')).toBe('list');
    expect(target.searchParams.get('gleap_tour')).toBe('tour-1');
    expect(target.hash).toBe('#board');
  });
});
