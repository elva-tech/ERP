import { useState } from 'react';
import { Search, Bell, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const Topbar = () => {
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  else if (location.pathname.startsWith('/notifications')) { breadcrumb = "ELVA Platform / Main"; pageTitle = "Notifications"; }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center h-16 shrink-0 z-50 relative">
      
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

      {/* Right: Notifications & Profile */}
      <div className="w-1/3 flex justify-end items-center gap-6">
        
        {/* Notification Bell */}
        <div className="relative">
          <div 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative cursor-pointer hover:bg-gray-50 p-2 rounded-full transition-colors"
          >
            <Bell className="text-gray-500" size={20} />
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white">
              1
            </span>
          </div>

          {/* Notification Dropdown */}
          {isNotificationsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsNotificationsOpen(false)}
              ></div>
              
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <span className="text-xs text-blue-600 cursor-pointer hover:underline">Mark all as read</span>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3">
                    <div className="mt-1 text-blue-500"><CheckCircle2 size={16} /></div>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">Tenant Provisioned</p>
                      <p className="text-xs text-gray-500 mt-1">Apex Manufacturing has successfully finished provisioning.</p>
                      <p className="text-[10px] text-gray-400 mt-2">2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3">
                    <div className="mt-1 text-red-500"><Bell size={16} /></div>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">Background Job Failed</p>
                      <p className="text-xs text-gray-500 mt-1">The S3 bucket creation task failed for Northstar Services.</p>
                      <p className="text-[10px] text-gray-400 mt-2">1 hour ago</p>
                    </div>
                  </div>
                </div>

                {/* FIXED: Now using a Link instead of a static div */}
                <Link 
                  to="/notifications"
                  onClick={() => setIsNotificationsOpen(false)} 
                  className="block p-3 text-center border-t border-gray-100 bg-gray-50 text-sm text-blue-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
            EA
          </div>
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