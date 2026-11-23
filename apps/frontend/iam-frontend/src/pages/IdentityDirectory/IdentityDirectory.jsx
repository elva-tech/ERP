
import { useMemo, useState } from 'react';
import { Search, Plus, MoreVertical, ChevronLeft, ChevronRight, Eye, UserCheck, UserX } from 'lucide-react';
const initialIdentities = [
  { id: 1, name: 'Prabhu T P', email: 'prabhu.tp@elva.com', centralId: 'CEN-10001', status: 'Active', mfa: true, createdOn: '10 Jun 2025' },
  { id: 2, name: 'Sowmya K', email: 'sowmya.k@elva.com', centralId: 'CEN-10002', status: 'Active', mfa: true, createdOn: '12 Jul 2025' },
  { id: 3, name: 'Rohith K', email: 'rohith.k@elva.com', centralId: 'CEN-10003', status: 'Pending', mfa: false, createdOn: '20 Aug 2025' },
  { id: 4, name: 'Manoj D', email: 'manoj.d@elva.com', centralId: 'CEN-10004', status: 'Suspended', mfa: true, createdOn: '05 Sep 2025' }
];
const statusStyles = {
  Active: 'bg-green-50 text-green-700',
  Pending: 'bg-orange-50 text-orange-700',
  Suspended: 'bg-red-50 text-red-700'
};
const pageSize = 4;
export default function IdentityDirectory({ setActiveTab, onViewIdentity }) {
  const [identities, setIdentities] = useState(initialIdentities);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mfaFilter, setMfaFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);
  const filteredIdentities = useMemo(() => {
    return identities.filter((identity) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = [identity.name, identity.email, identity.centralId].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All' || identity.status === statusFilter;
      const matchesMfa = mfaFilter === 'All' || (mfaFilter === 'Enabled' ? identity.mfa : !identity.mfa);
      return matchesSearch && matchesStatus && matchesMfa;
    });
  }, [identities, search, statusFilter, mfaFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredIdentities.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleIdentities = filteredIdentities.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
    setOpenMenu(null);
  };
  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
    setOpenMenu(null);
  };
  const handleMfaChange = (event) => {
    setMfaFilter(event.target.value);
    setPage(1);
    setOpenMenu(null);
  };
  const toggleStatus = (id) => {
    setIdentities((previous) => previous.map((identity) => {
      if (identity.id !== id) return identity;
      return { ...identity, status: identity.status === 'Suspended' ? 'Active' : 'Suspended' };
    }));
    setOpenMenu(null);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A192F]">Identity Directory</h1>
          <p className="text-gray-500 mt-1">Search and manage all identities</p>
        </div>
        <button type="button" onClick={() => setActiveTab('create')} className="flex items-center justify-center gap-2 bg-[#2563EB] text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={18} />
          Invite Identity
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={19} className="absolute left-3 top-3 text-gray-400" />
            <input type="search" value={search} onChange={handleSearchChange} placeholder="Search by name, email or Central ID..." aria-label="Search identities" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={handleStatusChange} aria-label="Filter by status" className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
          <select value={mfaFilter} onChange={handleMfaChange} aria-label="Filter by MFA" className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All MFA</option>
            <option value="Enabled">MFA Enabled</option>
            <option value="Disabled">MFA Disabled</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F8FAFC] text-gray-600 border-y border-gray-200">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">Name</th>
                <th scope="col" className="px-5 py-4 font-semibold">Email</th>
                <th scope="col" className="px-5 py-4 font-semibold">Central ID</th>
                <th scope="col" className="px-5 py-4 font-semibold">Status</th>
                <th scope="col" className="px-5 py-4 font-semibold">MFA</th>
                <th scope="col" className="px-5 py-4 font-semibold">Created On</th>
                <th scope="col" className="px-5 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleIdentities.map((identity) => (
                <tr key={identity.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">
                        {identity.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-medium text-gray-800">{identity.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{identity.email}</td>
                  <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{identity.centralId}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[identity.status]}`}>
                      {identity.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`flex items-center gap-1 text-xs font-medium ${identity.mfa ? 'text-green-600' : 'text-gray-500'}`}>
                      {identity.mfa ? <UserCheck size={15} /> : <UserX size={15} />}
                      {identity.mfa ? 'Enabled' : 'Not Set'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{identity.createdOn}</td>
                  <td className="px-5 py-4 text-center">
                    <div className="relative inline-block">
                      <button type="button" aria-label={`Actions for ${identity.name}`} aria-expanded={openMenu === identity.id} onClick={() => setOpenMenu(openMenu === identity.id ? null : identity.id)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                        <MoreVertical size={18} />
                      </button>
                      {openMenu === identity.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg text-left">
                          <button type="button" onClick={() => { setOpenMenu(null); onViewIdentity(identity); }} className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50">
                            <Eye size={16} /> View Details
                          </button>
                          <button type="button" onClick={() => toggleStatus(identity.id)} className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50">
                            {identity.status === 'Suspended' ? <UserCheck size={16} /> : <UserX size={16} />}
                            {identity.status === 'Suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleIdentities.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">No identities found matching your search or filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {filteredIdentities.length === 0 ? '0 of 0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredIdentities.length)} of ${filteredIdentities.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setOpenMenu(null); }} className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={17} />
            </button>
            <span className="px-3 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-semibold">{currentPage}</span>
            <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => { setPage(currentPage + 1); setOpenMenu(null); }} className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
