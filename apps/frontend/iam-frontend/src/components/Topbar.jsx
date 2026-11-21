import { Bell, ChevronDown } from 'lucide-react';

export default function Topbar({ activeTab }) {
  const getTitle = () => {
    switch(activeTab) {
      case 'auth': return 'Authentication & Security';
      case 'create': return 'Create / Invite';
      case 'directory': return 'Identity Directory';
      case 'sessions': return 'Sessions';
      case 'audit': return 'Security Audit';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={22} />
        </button>
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            CA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700 leading-tight">Central Admin</span>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}