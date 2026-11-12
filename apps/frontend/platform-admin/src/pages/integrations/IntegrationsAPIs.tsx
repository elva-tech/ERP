import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const IntegrationsAPIs = () => {
  const integrationFeatures = [
    { name: 'Connector catalogue', path: '/integrations/catalogue' },
    { name: 'Tenant integration activation', path: '/integrations/activation' },
    { name: 'API credentials & rotation', path: '/integrations/credentials' },
    { name: 'Read/write operation scopes', path: '/integrations/scopes' },
    { name: 'Integration activity & failures', path: '/integrations/activity' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations & APIs</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Integration governance</h2>
          <p className="text-gray-500 mt-1 text-sm">
            ELVA controls supported connectors, credentials, tenant scopes and external API permissions.
          </p>
        </div>

        {/* List of Integration Features */}
        <div className="flex flex-col">
          {integrationFeatures.map((feature, index) => (
            <Link 
              key={feature.name}
              to={feature.path}
              className={`flex justify-between items-center py-4 hover:bg-gray-50 transition-colors group px-2 -mx-2 rounded-lg ${
                index !== integrationFeatures.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                {feature.name}
              </span>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
};

export default IntegrationsAPIs;