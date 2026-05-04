import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';

export default function Register() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Register</h1>
        <p className="text-gray-600">
          Registration form will be implemented here.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
