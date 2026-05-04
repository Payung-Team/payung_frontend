import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';

export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Login</h1>
        <p className="text-gray-600">
          Login form will be implemented here.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
