import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');

  return (
    <main className="page page-narrow" style={{ paddingTop: 64 }}>
      <div className="card center">
        <p className="notfound-code">404</p>
        <h1>Page not found</h1>
        <p className="muted">
          The page you are looking for doesn&apos;t exist or has moved.
        </p>
        <p>
          <Link to="/" className="btn">
            Go to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
