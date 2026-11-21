import { ChevronDown } from 'lucide-react';

export default function Audit() {
  const logs = [
    { date: '12 Nov 2026, 04:12 PM', event: 'Login Success', user: 'Prabhu T P', result: 'Success' },
    { date: '12 Nov 2026, 03:45 PM', event: 'MFA Enabled', user: 'Sowmya K', result: 'Success' },
    { date: '12 Nov 2026, 02:30 PM', event: 'Failed Login', user: 'Unknown', result: 'Failed' },
    { date: '11 Nov 2026, 01:20 PM', event: 'Invitation Sent', user: 'Manoj D', result: 'Success' },
  ];

  return (
    <div className="max-w-[1100px] bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Security Audit Logs</h2>
          <p className="text-sm text-gray-500 mt-1">Track identity and security events</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Last 30 Days <ChevronDown size={16} />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 flex items-center gap-1">
                Date & Time <ChevronDown size={14} />
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Event</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">User</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{log.event}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.user}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    log.result === 'Success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${log.result === 'Success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {log.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="p-4 border-t border-gray-100 flex justify-end items-center gap-2">
        <span className="text-sm text-gray-500 mr-4">1-4 of 4</span>
        <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-400 bg-white">&lt;</button>
        <button className="px-3 py-1 bg-[#2563EB] text-white rounded text-sm font-medium">1</button>
        <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-400 bg-white">&gt;</button>
      </div>
    </div>
  );
}