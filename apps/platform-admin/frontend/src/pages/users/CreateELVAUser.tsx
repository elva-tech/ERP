import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateELVAUser = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/users" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add ELVA User</h1>
          <p className="text-gray-500 mt-1">Create a new internal platform administrator.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-center py-12">
          The ELVA User creation form will be built here.
        </p>
      </div>
    </div>
  );
};

export default CreateELVAUser;