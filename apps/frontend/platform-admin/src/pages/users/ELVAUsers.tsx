import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, deleteUser } from '../../api/userApi';
import { Shield, Wrench, Search, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ELVAUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const data = await getUsers();
      setUsers(data.content);
    } catch (err) {
      setError(true);
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    // The confirmation message before deleting
    if (!window.confirm(`Are you sure you want to delete the user "${name}"?`)) return;
    
    try {
      await deleteUser(id);
      toast.success("User deleted successfully.");
      fetchUsers(); // Refresh the list
    } catch (error) {
      toast.error("Failed to delete user.");
    }
  };

  // Calculate counts
  const platformAdmins = users.filter(u => u.platformRole === 'PLATFORM_ADMIN').length;
  const securityAdmins = users.filter(u => u.platformRole === 'SECURITY_ADMIN').length;
  const technicalAdmins = users.filter(u => u.platformRole === 'TECHNICAL_ADMIN').length;

  // Filtering Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.workEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.platformRole === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ELVA Users</h1>
          <p className="text-gray-500 mt-1">Internal ELVA users who can access platform administration.</p>
        </div>
        <Link 
          to="/users/new"
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          + Add ELVA User
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => setRoleFilter(roleFilter === 'PLATFORM_ADMIN' ? 'ALL' : 'PLATFORM_ADMIN')}
          className={`text-left bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-all hover:border-blue-400 ${roleFilter === 'PLATFORM_ADMIN' ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'}`}
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Shield size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-600">Platform Admins</p>
            <p className="text-2xl font-bold text-gray-900">{platformAdmins}</p>
          </div>
        </button>
        <button 
          onClick={() => setRoleFilter(roleFilter === 'SECURITY_ADMIN' ? 'ALL' : 'SECURITY_ADMIN')}
          className={`text-left bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-all hover:border-orange-400 ${roleFilter === 'SECURITY_ADMIN' ? 'border-orange-600 ring-1 ring-orange-600' : 'border-gray-200'}`}
        >
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Shield size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-600">Security Admins</p>
            <p className="text-2xl font-bold text-gray-900">{securityAdmins}</p>
          </div>
        </button>
        <button 
          onClick={() => setRoleFilter(roleFilter === 'TECHNICAL_ADMIN' ? 'ALL' : 'TECHNICAL_ADMIN')}
          className={`text-left bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-all hover:border-green-400 ${roleFilter === 'TECHNICAL_ADMIN' ? 'border-green-600 ring-1 ring-green-600' : 'border-gray-200'}`}
        >
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Wrench size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-600">Technical Admins</p>
            <p className="text-2xl font-bold text-gray-900">{technicalAdmins}</p>
          </div>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Internal Users</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="INVITATION_PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Work Email</th>
                <th className="p-4 font-medium">Platform Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Created By</th>
                <th className="p-4 font-medium">Created On</th>
                {/* NEW: Actions Header */}
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading users...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <p className="text-red-500 mb-2">Failed to load users.</p>
                    <button onClick={fetchUsers} className="text-blue-600 flex items-center justify-center gap-1 mx-auto hover:underline">
                      <RefreshCw size={14} /> Retry
                    </button>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No users match your filters.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{u.fullName}</td>
                    <td className="p-4 text-gray-600">{u.workEmail}</td>
                    <td className="p-4 text-gray-600 capitalize">{u.platformRole.replace('_', ' ').toLowerCase()}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{u.createdBy}</td>
                    <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    
                    {/* NEW: Actions Body with View and Delete buttons */}
                    <td className="p-4 text-right flex items-center justify-end gap-4">
                      <Link to={`/users/${u.id}`} className="text-blue-600 font-medium hover:underline">
                        View
                      </Link>
                      <button 
                        onClick={() => handleDelete(u.id, u.fullName)} 
                        className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
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

export default ELVAUsers;