import { 
  LayoutDashboard, Users, UserPlus, Shield, Monitor, FileText, Settings 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', name: 'Identity Directory', icon: Users },
    { id: 'create', name: 'Create / Invite', icon: UserPlus },
    { id: 'auth', name: 'Authentication & Security', icon: Shield },
    { id: 'sessions', name: 'Sessions', icon: Monitor },
    { id: 'audit', name: 'Security Audit', icon: FileText },
  ];

  return (
    <aside className="w-[260px] bg-[#0A192F] text-white flex flex-col shadow-xl z-10">
      {/* Logo Section (Matching your reference) */}
      <div className="h-[88px] flex items-center px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center border border-slate-700/50 shadow-sm shrink-0">
            <img src="/elva-logo.png" alt="ELVA" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px] tracking-wide text-white">ELVA TECH</span>
            <span className="text-[11px] text-blue-400 font-semibold tracking-widest mt-0.5">IAM</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-[#2563EB] text-white border-l-4 border-white' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
              {item.name}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors">
          <Settings size={20} /> Settings
        </button>
      </div>
    </aside>
  );
}