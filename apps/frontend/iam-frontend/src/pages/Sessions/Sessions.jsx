import { useState } from 'react';
import { Search } from 'lucide-react';

export default function Sessions() {
  const sessions = [
    { user: 'Arjun Mehta', device: 'Chrome - MacOS', location: 'Mumbai', login: '13 Nov 2026, 09:15 AM', expiry: '13 Nov 2026, 01:15 PM', action: 'Revoke' },
    { user: 'Neha Sharma', device: 'Safari - iOS', location: 'Delhi', login: '13 Nov 2026, 08:30 AM', expiry: '13 Nov 2026, 12:30 PM', action: 'Revoke' },
    { user: 'Vikram Singh', device: 'Edge - Windows', location: 'Pune', login: '12 Nov 2026, 10:45 PM', expiry: '13 Nov 2026, 02:45 AM', action: 'Revoke' },
    { user: 'Anjali Desai', device: 'Firefox - Ubuntu', location: 'Ahmedabad', login: '12 Nov 2026, 05:10 PM', expiry: '12 Nov 2026, 09:10 PM', action: 'Revoke' },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  // Filter logic: checks if the search term matches ANY property in the session object
  const filteredSessions = sessions.filter((session) =>
    Object.values(session).some((value) =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="max-w-[1100px] bg-white rounded-xl shadow-sm border border-gray-100">
      
      {/* Header with Search Bar */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Active Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">View and manage user sessions</p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">User</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Device</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Location</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Login Time</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Expiry</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session, index) => (
                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{session.user}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.device}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.location}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.login}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.expiry}</td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded hover:bg-red-100 transition-colors border border-red-100">
                      {session.action}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No sessions found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}