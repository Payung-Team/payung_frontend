import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-indigo-600">
        Payung
      </Link>
      <nav className="flex items-center gap-4">
        <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
          Login
        </Link>
        <Link to="/register" className="text-sm text-gray-600 hover:text-gray-900">
          Register
        </Link>
      </nav>
    </header>
  );
}
