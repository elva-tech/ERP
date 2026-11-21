export default function Sessions() {
  const sessions = [
    { user: 'Prabhu T P', device: 'Chrome - Windows', location: 'Bangalore', login: '12 Nov 2026, 04:12 PM', expiry: '12 Nov 2026, 08:12 PM' },
    { user: 'Sowmya K', device: 'Edge - Windows', location: 'Chennai', login: '12 Nov 2026, 03:50 PM', expiry: '12 Nov 2026, 07:50 PM' },
    { user: 'Rohith K', device: 'Chrome - Android', location: 'Bengaluru', login: '12 Nov 2026, 06:20 PM', expiry: '12 Nov 2026, 08:20 PM' },
  ];

  return (
    <div className="max-w-[1100px] bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Active Sessions</h2>
        <p className="text-sm text-gray-500 mt-1">View and manage user sessions</p>
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
            {sessions.map((session, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{session.user}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.device}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.location}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.login}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{session.expiry}</td>
                <td className="px-6 py-4">
                  <button className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded hover:bg-red-100 transition-colors border border-red-100">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}