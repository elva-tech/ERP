import { 
  LayoutDashboard, Building2, Blocks, Users, Plug, 
  ShieldCheck, Activity, Layers, ChevronDown, ChevronLeft 
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import elvaLogo from '../assets/elva-logo.png';
import { useState } from 'react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State to track which groups are open (true = open)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'MAIN': true,
    'ADMINISTRATION': true,
    'PLATFORM OPS': true
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Tenant Management', icon: Building2, path: '/tenants' },
        { name: 'Module Entitlements', icon: Blocks, path: '/modules' },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { name: 'ELVA Users', icon: Users, path: '/users' },
        { name: 'Integrations & APIs', icon: Plug, path: '/integrations' },
      ]
    },
    {
      title: 'PLATFORM OPS',
      items: [
        { name: 'Security & Audit', icon: ShieldCheck, path: '/security' },
        { name: 'Platform Operations', icon: Activity, path: '/operations' },
        { name: 'Shared Services', icon: Layers, path: '/services' },
      ]
    }
  ];

  return (
    <div className={`bg-elva-dark text-white min-h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Header Section */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-700/50 shrink-0">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 p-1.5 border border-slate-700">
          <img src={elvaLogo} alt="ELVA Logo" className="w-full h-full object-contain" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-white tracking-wide leading-tight">ELVA TECH</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-0.5">Platform Admin</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 mt-4 overflow-y-auto scrollbar-hide space-y-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            {/* Group Title (Clickable to toggle) */}
            {!isCollapsed && (
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full px-3 mb-1 flex items-center justify-between text-[11px] font-bold text-gray-500 tracking-wider hover:text-gray-300 transition-colors"
              >
                {group.title}
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-200 ${expandedGroups[group.title] ? '' : '-rotate-90'}`} 
                />
              </button>
            )}
            
            {/* Group Items (Only show if expanded) */}
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${expandedGroups[group.title] || isCollapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors relative ${
                      isActive
                        ? 'bg-blue-900/30 text-white font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-1 bg-green-400 rounded-r-md"></div>
                      )}
                      <item.icon size={18} className={isActive ? 'text-green-400' : ''} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="p-4 mt-auto border-t border-gray-700/50 shrink-0">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium w-full"
        >
          {isCollapsed ? <ChevronLeft size={18} className="rotate-180" /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;