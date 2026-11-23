import { ChevronDown } from 'lucide-react';

export default function Audit() {
  const logs = [
    { date: '13 Nov 2026, 10:05 AM', event: 'Password Changed', user: 'Arjun Mehta', result: 'Success' },
    { date: '13 Nov 2026, 09:22 AM', event: 'Failed Login', user: 'test@elva.com', result: 'Failed' },
    { date: '12 Nov 2026, 11:40 PM', event: 'User Invited', user: 'Central Admin', result: 'Success' },
    { date: '12 Nov 2026, 04:15 PM', event: 'MFA Reset', user: 'Neha Sharma', result: 'Success' },
  ];

  return (
    <div className="max-w-[1100px] bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Security Audit Logs</h2>
          <p className="text-sm text-gray-500 mt-1">Track identity and security events</p>
        </div>
        
        {/* Date Range Dropdown */}
        <div className="relative">
          <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <ChevronDown size={16} />
          </div>
        </div>
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