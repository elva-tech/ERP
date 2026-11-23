
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Grid2X2, Clock3, UserRound, Mail, Phone, CalendarDays } from 'lucide-react';
export default function IdentityDetails({ identity, setActiveTab }) {
  const [activeSection, setActiveSection] = useState('overview');
  if (!identity) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <p className="text-gray-600 mb-4">No identity selected.</p>
        <button type="button" onClick={() => setActiveTab('directory')} className="text-blue-600 font-semibold flex items-center gap-2">
          <ArrowLeft size={17} /> Back to Directory
        </button>
      </div>
    );
  }
  const initials = identity.name.split(' ').map((part) => part[0]).slice(0, 2).join('');
  const statusColors = {
    Active: 'bg-green-50 text-green-700',
    Pending: 'bg-orange-50 text-orange-700',
    Suspended: 'bg-red-50 text-red-700'
  };
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'apps', label: 'Linked Apps' },
    { id: 'activity', label: 'Activity History' }
  ];
  return (
    <div className="space-y-6">
      <button type="button" onClick={() => setActiveTab('directory')} className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:text-blue-800">
        <ArrowLeft size={17} />
        Back to Directory
      </button>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          <div className="border-b lg:border-b-0 lg:border-r border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-2xl font-bold mb-4">
                {initials}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <h2 className="text-lg font-bold text-[#0A192F]">{identity.name}</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[identity.status] || 'bg-gray-100 text-gray-700'}`}>
                  {identity.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{identity.centralId}</p>
            </div>
            <div className="space-y-1 mt-8">
              {sections.map((section) => (
                <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {section.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 lg:p-8">
            {activeSection === 'overview' && (
              <div className="space-y-7">
                <div>
                  <h3 className="text-lg font-bold text-[#0A192F] mb-5">Identity Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex items-start gap-3">
                      <Mail size={19} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-800 break-all">{identity.email}</p>
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle2 size={13} /> Verified (Demo)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone size={19} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm font-medium text-gray-800">{identity.phone || 'Not available'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarDays size={19} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Created On</p>
                        <p className="text-sm font-medium text-gray-800">{identity.createdOn}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <UserRound size={19} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Account Status</p>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[identity.status] || 'bg-gray-100 text-gray-700'}`}>
                          {identity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={20} className="text-[#2563EB]" />
                      <h3 className="font-bold text-[#0A192F]">MFA Status</h3>
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${identity.mfa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {identity.mfa ? 'Enabled' : 'Not Set'}
                    </span>
                    <p className="text-sm text-gray-500 mt-3">Multi-factor authentication status</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Grid2X2 size={20} className="text-[#2563EB]" />
                      <h3 className="font-bold text-[#0A192F]">Linked Applications</h3>
                    </div>
                    <p className="text-sm font-medium text-gray-700">ERP Platform</p>
                    <p className="text-xs text-gray-500 mt-2">1 sample application</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === 'apps' && (
              <div>
                <h3 className="text-lg font-bold text-[#0A192F] mb-5">Linked Applications</h3>
                <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Grid2X2 size={23} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">ERP Platform</p>
                    <p className="text-sm text-gray-500">Sample linked application</p>
                  </div>
                </div>
              </div>
            )}
            {activeSection === 'activity' && (
              <div>
                <h3 className="text-lg font-bold text-[#0A192F] mb-5">Activity History</h3>
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-5">
                  <Clock3 size={21} className="text-blue-600" />
                  <p className="text-sm text-gray-600">No activity history available for this sample identity.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
