import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import App from '../../src/App';

describe('Tattoo Finder app', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/tattoo-finder/');
  });

  it('renders the mobile-first browse surface with real dataset counts', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /tattoo finder/i })).toBeInTheDocument();
    expect(screen.getAllByText(/471 records/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /show map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load 80 more/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search artists, studios, cities, styles/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters records by query and opens a detail sheet', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByRole('searchbox', { name: /search artists, studios, cities, styles/i }),
      'Ritual Tattoo',
    );
    await user.click(await screen.findByRole('button', { name: /open ritual tattoo details/i }));

    const detail = await screen.findByRole('dialog', { name: /ritual tattoo/i });
    expect(within(detail).getByText(/source verified/i)).toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: /visit official site/i })).toHaveAttribute(
      'href',
      expect.stringContaining('ritualtat'),
    );
  });

  it('labels permit-only records as source checks rather than booking actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByRole('searchbox', { name: /search artists, studios, cities, styles/i }),
      'Aces Tattoo',
    );
    await user.click(await screen.findByRole('button', { name: /open aces tattoo details/i }));

    const detail = await screen.findByRole('dialog', { name: /aces tattoo/i });
    expect(within(detail).getByRole('link', { name: /view permit source/i })).toBeInTheDocument();
    expect(within(detail).getByText(/permit only/i)).toBeInTheDocument();
  });

  it('persists saved records and exposes the saved-only filter', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstSave = screen.getAllByRole('button', { name: /^save /i })[0];
    await user.click(firstSave);
    expect(screen.getAllByText(/1 saved/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /saved only/i }));
    expect(screen.getAllByText(/showing 1/i).length).toBeGreaterThan(0);
  });

  it('switches between mobile list and map surfaces', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /show map/i }));

    expect(await screen.findByRole('region', { name: /bay area map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show list/i })).toBeInTheDocument();
  });
});
