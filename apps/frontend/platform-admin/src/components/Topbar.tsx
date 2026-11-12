import { Search, Bell, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Topbar = () => {
  const location = useLocation();

  // Dynamic breadcrumb logic
  let breadcrumb = "ELVA Platform / Main";
  let pageTitle = "Dashboard";
  
  if (location.pathname.startsWith('/tenants')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Tenant Management"; }
  else if (location.pathname.startsWith('/modules')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Module Entitlements"; }
  else if (location.pathname.startsWith('/users')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "ELVA Users"; }
  else if (location.pathname.startsWith('/integrations')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Integrations & APIs"; }
  else if (location.pathname.startsWith('/security')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Security & Audit"; }
  else if (location.pathname.startsWith('/operations')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Platform Operations"; }
  else if (location.pathname.startsWith('/services')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Shared Services"; }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center h-16 shrink-0 z-10">
      
      {/* Left: Breadcrumbs */}
      <div className="w-1/3">
        <p className="text-[11px] text-gray-400 font-medium mb-0.5 uppercase tracking-wide">{breadcrumb}</p>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">
          {pageTitle}
        </h2>
      </div>
      
      {/* Center: Search Bar */}
      <div className="w-1/3 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search pages or tenants..." 
            className="bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile (Matching your snippet) */}
      <div className="w-1/3 flex justify-end items-center gap-6">
        
        {/* Bell Icon */}
        <div className="relative cursor-pointer hover:bg-gray-50 p-1 rounded-full transition-colors">
          <Bell className="text-gray-500" size={20} />
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border-2 border-white">
            1
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          {/* Avatar */}
          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
            EA
          </div>
          
          {/* Text */}
          <div className="flex flex-col">
            <p className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">ELVA Admin</p>
            <p className="text-gray-500 text-xs leading-tight">Platform Admin</p>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Topbar;