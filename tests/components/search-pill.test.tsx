import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SearchPill } from '../../src/components/SearchPill';

describe('SearchPill', () => {
  it('renders Airbnb-like search segments and submits', async () => {
    render(
      <MemoryRouter>
        <SearchPill styles={['Blackwork', 'Fine line']} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Where')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Fine line, Oakland, Ritual'), 'oakland');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  });
});
