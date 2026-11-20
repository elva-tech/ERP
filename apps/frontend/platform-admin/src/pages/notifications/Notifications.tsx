import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Bell } from 'lucide-react';

const Notifications = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Notifications</h1>
          <p className="text-gray-500 mt-1">Your recent platform alerts and updates.</p>
        </div>
      </div>

      {/* Notifications List Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800">Inbox</h2>
          <span className="text-sm text-blue-600 cursor-pointer hover:underline">Mark all as read</span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {/* Sample Notification Item 1 */}
          <div className="p-5 hover:bg-gray-50 cursor-pointer flex gap-4 transition-colors">
            <div className="mt-1 text-blue-500 shrink-0"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-gray-900 font-medium text-base">Tenant Provisioned</p>
              <p className="text-gray-500 text-sm mt-1">Apex Manufacturing has successfully finished provisioning.</p>
              <p className="text-xs text-gray-400 mt-2">2 minutes ago</p>
            </div>
          </div>
          
          {/* Sample Notification Item 2 */}
          <div className="p-5 hover:bg-gray-50 cursor-pointer flex gap-4 transition-colors">
            <div className="mt-1 text-red-500 shrink-0"><Bell size={20} /></div>
            <div>
              <p className="text-gray-900 font-medium text-base">Background Job Failed</p>
              <p className="text-gray-500 text-sm mt-1">The S3 bucket creation task failed for Northstar Services.</p>
              <p className="text-xs text-gray-400 mt-2">1 hour ago</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Notifications;