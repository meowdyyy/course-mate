import { Link } from 'react-router-dom';
import { BookOpenIcon } from '@heroicons/react/24/outline';

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center">
          <BookOpenIcon className="h-12 w-12 text-primary-600" />
          <span className="ml-2 text-2xl font-bold text-gray-900">CourseMate</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Course Management System
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
    </div>
  );
};

export default PublicLayout;
