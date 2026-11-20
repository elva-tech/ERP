import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PlatformOperations = () => {
  const operationFeatures = [
    { name: 'Environment overview: Development / QA / Staging / Production', path: '/operations/environments' },
    { name: 'Release approvals and deployment history', path: '/operations/releases' },
    { name: 'Database backups and restore requests', path: '/operations/backups' },
    { name: 'Tenant export oversight', path: '/operations/exports' },
    { name: 'Infrastructure and service monitoring', path: '/operations/monitoring' },
    { name: 'Background job failures and alerts', path: '/operations/jobs' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Operations</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Platform operations</h2>
        </div>

        {/* List of Operations Features */}
        <div className="flex flex-col">
          {operationFeatures.map((feature, index) => (
            <Link 
              key={feature.name}
              to={feature.path}
              className={`flex justify-between items-center py-4 hover:bg-gray-50 transition-colors group px-2 -mx-2 rounded-lg ${
                index !== operationFeatures.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-gray-700 group-hover:text-gray-900">
                {feature.name}
              </span>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
            </Link>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            Production release approval and infrastructure recovery controls are restricted to authorised ELVA personnel.
          </p>
        </div>

      </div>
    </div>
  );
};

export default PlatformOperations;