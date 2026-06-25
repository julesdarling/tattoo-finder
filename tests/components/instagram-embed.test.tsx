import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstagramEmbed } from '../../src/components/InstagramEmbed';

describe('InstagramEmbed', () => {
  it('renders an official embed placeholder with link fallback', () => {
    render(<InstagramEmbed postUrl="https://www.instagram.com/p/example-post/" />);

    expect(screen.getByText(/official instagram embed/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open on instagram/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/p/example-post/',
    );
  });

  it('renders profile fallback when no post is available', () => {
    render(<InstagramEmbed profileUrl="https://www.instagram.com/ritualtattoo/" />);

    expect(screen.getByText(/portfolio link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open instagram profile/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/ritualtattoo/',
    );
  });
});
