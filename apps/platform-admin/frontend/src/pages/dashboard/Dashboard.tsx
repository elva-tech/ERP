import { useState, useEffect } from 'react';
import { Building2, CheckCircle2, RefreshCw, PauseCircle, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/tenants');
        if (response.ok) {
          setTenants(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchTenants();
  }, []);

  // Calculate stats dynamically
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const provisioningTenants = tenants.filter(t => t.status === 'PROVISIONING').length;
  const suspendedTenants = tenants.filter(t => t.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, ELVA Admin</h1>
          <p className="text-gray-500 mt-1">Here's the current status of your ELVA platform.</p>
        </div>
        <Link 
          to="/tenants/new" 
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Add New Tenant
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-600">Total tenants</p>
            <Building2 size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalTenants}</p>
          <p className="text-sm text-gray-500 mt-1">Registered on platform</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-600">Active tenants</p>
            <CheckCircle2 size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{activeTenants}</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0}% of total
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-600">Provisioning</p>
            <RefreshCw size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{provisioningTenants}</p>
          <p className="text-sm text-gray-500 mt-1">Pending activation</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-600">Suspended</p>
            <PauseCircle size={20} className="text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{suspendedTenants}</p>
          <p className="text-sm text-gray-500 mt-1">Requires review</p>
        </div>
      </div>

      {/* Platform Health & Recent Activity (Keep your existing layout here) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tenant provisioning</h2>
            <p className="text-sm text-gray-500">Recent onboarding activity</p>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            {tenants.length > 0 ? (
                <p className="text-gray-500 text-sm">You have {tenants.length} tenants in the system.</p>
            ) : (
                <p className="text-gray-500 text-sm">No recent provisioning activity.</p>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 text-center">
            <Link to="/tenants" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-1 w-full">
              View all tenants <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Platform health - Keep this exactly as you had it */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Platform health</h2>
            <p className="text-sm text-gray-500">Operational overview</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <p className="text-gray-700">Application services</p>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Operational</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-gray-700">Database</p>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Operational</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-gray-700">Document storage</p>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Operational</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-gray-700">Notification service</p>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Operational</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <p className="text-gray-700">Background jobs</p>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">0 failures</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;