import { Layers } from 'lucide-react';

const ModuleEntitlements = () => {
  const tenants: any[] = [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Module Entitlements</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Tenant module control</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Manage module access independently for each tenant. Dependency checks are required before activation or deactivation.
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-gray-200">
                <th className="pb-3 font-medium w-1/3">Tenant</th>
                <th className="pb-3 font-medium w-1/3">Enabled modules</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {tenants.length > 0 ? (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="py-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="py-4 text-gray-600">{tenant.modules.join(', ')}</td>
                    <td className="py-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        {tenant.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Layers size={32} className="text-gray-300 mb-3" />
                      <p>No tenants available to configure.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Tenants must be created before modules can be managed.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button 
            onClick={() => {
              if (tenants.length === 0) {
                alert("Please create a tenant first before managing entitlements.");
              }
            }}
            className="w-full bg-gray-900 text-white hover:bg-gray-800 py-3.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Manage entitlements
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModuleEntitlements;