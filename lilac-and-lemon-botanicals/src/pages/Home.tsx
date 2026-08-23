import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <header className="hero">
      <div className="wrap">
        <span className="eyebrow">Small-batch skincare · founded by a master esthetician</span>
          <div className="art-frame filled story-art">
          <img src="/illustrations/rue-logo-official.png" alt="Brand logo" />
        </div>

        <p className="tagline">
       Formulas built on your needs and nothing else. Tested only on those that can consent (animals are safe here).
        </p>


        <div className="hero-links">
          <Link to="/about" className="hero-link">Read the story</Link>
          <Link to="/products" className="hero-link">See what's coming</Link>
        </div>
      </div>
    </header>
  );
}
