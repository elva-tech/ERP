import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SecurityAudit = () => {
  // Empty data states
  const openIncidents = 0;
  const failedLogins = 0;
  const suspiciousSessions = 0;

  const securityFeatures = [
    { name: 'Incident investigation', path: '/security/incidents' },
    { name: 'Suspicious login review', path: '/security/logins' },
    { name: 'Session and account revocation', path: '/security/sessions' },
    { name: 'Immutable audit search & export', path: '/security/audit' },
    { name: 'Malware alerts', path: '/security/malware' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Audit</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header & Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Platform security overview</h2>
          
          <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-6">
            <div>
              <p className="text-3xl font-bold text-gray-900">{openIncidents}</p>
              <p className="text-gray-500 mt-1">Open incidents</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{failedLogins}</p>
              <p className="text-gray-500 mt-1">Failed logins</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{suspiciousSessions}</p>
              <p className="text-gray-500 mt-1">Suspicious sessions</p>
            </div>
          </div>
        </div>

        {/* List of Security Features */}
        <div className="flex flex-col">
          {securityFeatures.map((feature, index) => (
            <Link 
              key={feature.name}
              to={feature.path}
              className={`flex justify-between items-center py-4 hover:bg-gray-50 transition-colors group px-2 -mx-2 rounded-lg ${
                index !== securityFeatures.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-gray-700 group-hover:text-gray-900">
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

export default SecurityAudit;