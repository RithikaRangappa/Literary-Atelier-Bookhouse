
import atelierLogo from '../assets/literary-atelier-logo.png';
import './LandingPage.css';

function LandingPage({ onSignIn }) {
  return (
    <main className="atelier-home">
      <header className="atelier-header">
        <div className="atelier-topbar">
          <a className="atelier-brand" href="#home">
            <img
  src={atelierLogo}
  alt="The Literary Atelier - A Curated Bookhouse"
  className="atelier-logo-image"
  style={{
    width: '58px',
    height: '58px',
    minWidth: '58px',
    maxWidth: '58px',
    objectFit: 'contain',
    flex: '0 0 58px'
  }}
/>

            <span className="atelier-brand-text">
              <strong>THE LITERARY ATELIER</strong>
              <em>A CURATED BOOKHOUSE</em>
            </span>
          </a>

          <nav className="atelier-utility-nav">
            <a href="#collection">NEWS</a>
            <a href="#about">ABOUT US</a>
            <a href="#contact">CONTACT</a>
            <button onClick={onSignIn}>SIGN IN ↗</button>
          </nav>
        </div>

        <nav className="atelier-main-nav">
          <a href="#collection">COLLECTIONS</a>
          <a href="#collection">CATALOGUE</a>
          <a href="#collection">CATEGORIES</a>
          <a href="#about">ABOUT</a>
        </nav>
      </header>

      <section className="atelier-about" id="about">
        <h1>About</h1>

        <div className="atelier-about-copy">
          <p>
            The Literary Atelier is a curated bookhouse dedicated to
            preserving, discovering and circulating works of enduring
            cultural and intellectual value. We bring together literature,
            contemporary works and thoughtful reads for a community of
            discerning readers.
          </p>

          <span className="atelier-copy-divider" />

          <p>
            Rooted in a love for literature and knowledge, our collection
            offers a thoughtfully curated reading experience. The Literary
            Atelier is more than a bookstore; it is a space for ideas,
            history and the constantly evolving world of books.
          </p>
        </div>
      </section>

      <section className="atelier-library" id="collection">
        <img
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=2000&q=90"
          alt="A grand library filled with bookshelves"
        />

        <div className="atelier-library-caption">
          <span>THE ART OF DISCOVERY</span>
          <button onClick={onSignIn}>
            EXPLORE THE COLLECTION ↗
          </button>
        </div>
      </section>

      <footer className="atelier-footer" id="contact">
        <span>THE LITERARY ATELIER</span>
        <span>A CURATED BOOKHOUSE</span>
        <button onClick={onSignIn}>MEMBER SIGN IN ↗</button>
      </footer>
    </main>
  );
}

export default LandingPage;
