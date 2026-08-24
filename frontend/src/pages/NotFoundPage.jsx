import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="container py-5 text-center">
      <h1 className="display-5">Page not found</h1>
      <p className="text-secondary">The requested HouseBalance page does not exist.</p>
      <Link className="btn btn-primary" to="/groups">Go to My Groups</Link>
    </main>
  );
}

