
import { Users, UserCheck, Clock3, UserX, ShieldCheck, ShieldAlert, Info, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
export default function Dashboard({ setActiveTab }) {
  const stats = [
    { title: 'Total Identities', value: '2,540', change: '5%', positive: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Active', value: '2,320', change: '8%', positive: true, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pending', value: '120', change: '2%', positive: false, icon: Clock3, color: 'text-orange-500', bg: 'bg-orange-50' },
    { title: 'Suspended', value: '100', change: '1%', positive: false, icon: UserX, color: 'text-red-500', bg: 'bg-red-50' }
  ];
  const events = [
    { id: 1, message: 'Successful login from Bangalore', time: '2 min ago', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 2, message: 'Failed login attempt from unknown device', time: '12 min ago', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 3, message: 'MFA enabled for user prabhu.t', time: '1 hr ago', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' }
  ];
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-[#0A192F]">Welcome, Central Admin</h1>
        <p className="text-gray-500 mt-1">Manage identities and security across ELVA</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.positive ? TrendingUp : TrendingDown;
          return (
            <div key={stat.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={24} className={stat.color} />
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <div className="flex items-center justify-between mt-2">
                <h2 className="text-3xl font-bold text-[#0A192F]">{stat.value}</h2>
                <span className={`flex items-center gap-1 text-xs font-semibold ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                  <TrendIcon size={14} />
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0A192F]">Recent Security Events</h2>
            <button type="button" onClick={() => setActiveTab('audit')} className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-800">
              View All <ArrowRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {events.map((event) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className="flex items-center gap-4 py-4">
                  <div className={`w-10 h-10 ${event.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    <Icon size={20} className={event.color} />
                  </div>
                  <p className="flex-1 text-sm font-medium text-gray-700">{event.message}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{event.time}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-[#EFF6FF] rounded-xl border border-blue-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
            <ShieldCheck size={44} className="text-[#2563EB]" />
          </div>
          <h2 className="text-xl font-bold text-[#0A192F]">Secure. Manage. Control.</h2>
          <p className="text-sm text-gray-600 mt-3 max-w-xs">ELVA IAM - Your Central Identity Platform</p>
        </div>
      </div>
    </div>
  );
}
