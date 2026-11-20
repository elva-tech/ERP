import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAvailableModules, createModule, deleteModule } from '../../api/tenantApi';

const ModuleCatalogue = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Custom Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<{ code: string, name: string } | null>(null);

  const fetchModules = async () => {
    try {
      const data = await getAvailableModules();
      setModules(data);
    } catch (error) {
      toast.error("Failed to load modules.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Module Name is required");
    
    try {
      const generatedCode = formData.name.toUpperCase().replace(/\s+/g, '_');
      const payload = { 
        code: generatedCode, 
        name: formData.name, 
        description: formData.description, 
        isActive: true 
      };

      await createModule(payload);
      toast.success("Module created successfully!");
      setIsCreating(false);
      setFormData({ name: '', description: '' });
      fetchModules();
    } catch (error: any) {
      toast.error(error.message || "Failed to create module.");
    }
  };

  const handleDeleteClick = (code: string, name: string) => {
    setModuleToDelete({ code, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!moduleToDelete) return;
    try {
      await deleteModule(moduleToDelete.code);
      toast.success("Module deleted successfully.");
      setDeleteModalOpen(false);
      fetchModules();
    } catch (error) {
      toast.error("Failed to delete module.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/modules" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Catalogue</h1>
          <p className="text-gray-500 mt-1">Manage the global list of available ERP modules.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="ml-auto bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} /> Add Module
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Create New Module</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Name *</label>
            <input type="text" required placeholder="e.g. Inventory Management" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" placeholder="Brief description of the module" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Save Module</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
              <th className="p-4 font-medium">Code (Auto-generated)</th>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading modules...</td></tr>
            ) : modules.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No modules in catalogue.</td></tr>
            ) : (
              modules.map(m => (
                <tr key={m.code} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs text-gray-500">{m.code}</td>
                  <td className="p-4 font-medium text-gray-900">{m.name}</td>
                  <td className="p-4 text-gray-600">{m.description || '-'}</td>
                  
                  {/* UPDATED: ONLY ICON HERE */}
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteClick(m.code, m.name)} 
                      className="text-red-600 hover:text-red-800 p-1.5 rounded-md hover:bg-red-50 transition-colors inline-block"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && moduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Module</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{moduleToDelete.name}</strong>? This will remove it from all tenants.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                Delete Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleCatalogue;