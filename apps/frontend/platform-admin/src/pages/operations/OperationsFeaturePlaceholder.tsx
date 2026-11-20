import { ArrowLeft, Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const OperationsFeaturePlaceholder = () => {
  const location = useLocation();
  const featureName = location.pathname.split('/').pop() || 'Feature';
  const formattedName = featureName.charAt(0).toUpperCase() + featureName.slice(1);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/operations" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{formattedName}</h1>
          <p className="text-gray-500 mt-1">Platform Operations / {formattedName}</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Activity size={32} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Under Construction</h2>
        <p className="text-gray-500 max-w-md">
          The detailed operational UI for <strong>{formattedName}</strong> will be built here.
        </p>
      </div>
    </div>
  );
};

export default OperationsFeaturePlaceholder;