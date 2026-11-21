import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Shield, 
  Monitor, 
  FileText, 
  Settings, 
  Bell, 
  ChevronDown 
} from 'lucide-react';

export default function Layout({ children, activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory', name: 'Identity Directory', icon: Users },
    { id: 'create', name: 'Create / Invite', icon: UserPlus },
    { id: 'auth', name: 'Authentication & Security', icon: Shield },
    { id: 'sessions', name: 'Sessions', icon: Monitor },
    { id: 'audit', name: 'Security Audit', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-[260px] bg-elvaDark text-white flex flex-col shadow-xl z-10">
        
                
                
        <div className="h-[88px] flex items-center px-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            
            {/* The dark rounded box containing the logo icon */}
            <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center border border-slate-700/50 shadow-sm shrink-0">
              <img 
                src="/elva-logo.png" 
                alt="ELVA Icon" 
                className="w-8 h-8 object-contain"
              />
            </div>
            
            {/* The text next to the logo */}
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[15px] tracking-wide text-white">ELVA TECH</span>
              <span className="text-[11px] text-blue-400 font-semibold tracking-widest mt-0.5">IAM</span>
            </div>

          </div>
        </div>
        
        {/* Navigation Links */}
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
                    ? 'bg-elvaBlue text-white border-l-4 border-white' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Settings Link at Bottom */}
        <div className="p-4 border-t border-slate-700/50">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors">
            <Settings size={20} />
            Settings
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <div>
            {/* Dynamic Title based on Active Tab */}
            <h2 className="text-xl font-bold text-gray-800">
              {activeTab === 'auth' ? 'Authentication & Security' : 
               activeTab === 'create' ? 'Create / Invite' :
               activeTab === 'directory' ? 'Identity Directory' :
               activeTab === 'sessions' ? 'Sessions' :
               activeTab === 'audit' ? 'Security Audit' : 'Dashboard'}
            </h2>
          </div>
          
          {/* Right Side: Bell & Profile */}
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={22} />
            </button>
            
            <div className="flex items-center gap-3 cursor-pointer">
              {/* Avatar Circle */}
              <div className="w-9 h-9 rounded-full bg-elvaBlue text-white flex items-center justify-center font-bold text-sm shadow-sm">
                CA
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700 leading-tight">Central Admin</span>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </header>

        {/* The actual page content goes here */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}