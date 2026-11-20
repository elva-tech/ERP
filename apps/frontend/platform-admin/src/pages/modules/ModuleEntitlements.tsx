import { useState, useEffect } from 'react';
import { Layers, X, Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTenants, updateTenantModules, getAvailableModules } from '../../api/tenantApi';
import { Link } from 'react-router-dom';

const ModuleEntitlements = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: Search State
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalModules, setModalModules] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [tenantsData, modulesData] = await Promise.all([
        getTenants(),
        getAvailableModules()
      ]);
      setTenants(tenantsData.content);
      setAvailableModules(modulesData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // NEW: Filtering Logic
  const filteredTenants = tenants.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchName = t.name.toLowerCase().includes(query);
    const matchStatus = t.status.toLowerCase().includes(query);
    const matchModules = t.modules && t.modules.join(' ').toLowerCase().includes(query);
    return matchName || matchStatus || matchModules;
  });

  const handleManageClick = (tenant: any) => {
    setSelectedTenant(tenant);
    setModalModules(Array.isArray(tenant.modules) ? [...tenant.modules] : []);
    setIsModalOpen(true);
  };

  const handleAddModule = (moduleName: string) => {
    if (!modalModules.includes(moduleName)) {
      setModalModules(prev => [...prev, moduleName]);
    }
  };

  const handleDeleteModule = (moduleName: string) => {
    setModalModules(prev => prev.filter(m => m !== moduleName));
  };

  const handleSaveModules = async () => {
    if (!selectedTenant) return;
    setIsSaving(true);
    try {
      await updateTenantModules(selectedTenant.id, modalModules);
      toast.success(`Modules updated for ${selectedTenant.name}`);
      setIsModalOpen(false);
      fetchData(); 
    } catch (error) {
      toast.error("Failed to update modules.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Catalogue Button */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Entitlements</h1>
          <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
        </div>
        <Link 
          to="/modules/catalogue" 
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          Manage Module Catalogue
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Table Header with Search */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tenant module control</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Manage module access independently for each tenant.
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search tenant, module..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-gray-200">
                <th className="pb-3 font-medium w-1/3">Tenant</th>
                <th className="pb-3 font-medium w-1/3">Enabled modules</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filteredTenants.length > 0 ? (
                // MAP OVER FILTERED TENANTS
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="py-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="py-4 text-gray-600">
                      {tenant.modules && tenant.modules.length > 0 
                        ? tenant.modules.join(', ') 
                        : <span className="text-gray-400 italic">None assigned</span>}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        tenant.status === 'PROVISIONING' ? 'bg-blue-100 text-blue-700' : 
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {tenant.status.charAt(0) + tenant.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button onClick={() => handleManageClick(tenant)} className="text-blue-600 font-medium hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">No results match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (Unchanged) */}
      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Modules</h3>
                <p className="text-sm text-gray-500">{selectedTenant.name}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">Click Add or Delete to manage this tenant's access.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {availableModules.map((mod) => {
                  const isAssigned = modalModules.includes(mod.name);
                  return (
                    <div key={mod.code} className={`p-3 border rounded-lg flex items-center justify-between transition-all ${isAssigned ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
                      <span className={`font-medium ${isAssigned ? 'text-blue-900' : 'text-gray-600'}`}>
                        {mod.name}
                      </span>
                      
                      {isAssigned ? (
                        <button onClick={() => handleDeleteModule(mod.name)} className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                          <Trash2 size={14} /> Delete
                        </button>
                      ) : (
                        <button onClick={() => handleAddModule(mod.name)} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors">
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={handleSaveModules} disabled={isSaving} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleEntitlements;