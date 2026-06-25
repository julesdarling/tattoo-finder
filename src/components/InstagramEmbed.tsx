type InstagramEmbedProps = {
  postUrl?: string;
  profileUrl?: string;
};

export function InstagramEmbed({ postUrl, profileUrl }: InstagramEmbedProps) {
  if (postUrl) {
    return (
      <section className="embed-panel" aria-label="Official Instagram embed fallback">
        <div>
          <p className="eyebrow">Official Instagram embed</p>
          <p className="embed-copy">
            This app stores the official post URL only. Open Instagram to view the live portfolio
            post from its source.
          </p>
        </div>
        <a className="button button-dark" href={postUrl} target="_blank" rel="noreferrer">
          Open on Instagram
        </a>
      </section>
    );
  }

  if (profileUrl) {
    return (
      <section className="embed-panel" aria-label="Instagram profile fallback">
        <div>
          <p className="eyebrow">Portfolio link</p>
          <p className="embed-copy">
            No official post embed is stored yet. Use the profile link to inspect the current
            portfolio before booking.
          </p>
        </div>
        <a className="button button-dark" href={profileUrl} target="_blank" rel="noreferrer">
          Open Instagram profile
        </a>
      </section>
    );
  }

  return (
    <section className="embed-panel muted" aria-label="Portfolio fallback">
      <div>
        <p className="eyebrow">Portfolio check</p>
        <p className="embed-copy">
          No Instagram source is attached. Use the website or permit source before booking.
        </p>
      </div>
    </section>
  );
}
