import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTenants } from '../../api/tenantApi';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  code: string;
  legalEntity: string;
  status: string;
  modules: string[];
}

const TenantManagement = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await getTenants();
        setTenants(data.content); 
      } catch (error) {
        console.error(error);
        toast.error("Failed to load tenants.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter((tenant) => {
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.code.toLowerCase().includes(query) ||
      (tenant.modules && tenant.modules.join(', ').toLowerCase().includes(query))
    );
  });

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const provisioningTenants = tenants.filter(t => t.status === 'PROVISIONING').length;
  const suspendedTenants = tenants.filter(t => t.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-500 mt-1">Create and manage ELVA customer organisations.</p>
        </div>
        <Link 
          to="/tenants/new" 
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Add New Tenant
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-lg text-sm font-medium">
          All tenants · {totalTenants}
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Active · {activeTenants}
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Provisioning · {provisioningTenants}
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Suspended · {suspendedTenants}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">All tenants</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {/* 3. WIRE UP THE INPUT TO THE STATE */}
            <input 
              type="text" 
              placeholder="Search tenants..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="p-4 font-medium">Tenant</th>
                <th className="p-4 font-medium">Tenant ID</th>
                <th className="p-4 font-medium">Modules</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-blue-500" size={24} />
                    Loading tenants...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    No tenants found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                // 4. MAP OVER THE FILTERED LIST INSTEAD OF THE RAW LIST
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="p-4 text-gray-600">{tenant.code}</td>
                    
                    <td className="p-4 text-gray-600">
                      {tenant.modules && tenant.modules.length > 0 
                        ? tenant.modules.join(', ') 
                        : <span className="text-gray-400 italic">None assigned</span>}
                    </td>
                    
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        tenant.status === 'PROVISIONING' ? 'bg-blue-100 text-blue-700' : 
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {tenant.status.charAt(0) + tenant.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/tenants/${tenant.id}`} className="text-blue-600 font-medium hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantManagement;