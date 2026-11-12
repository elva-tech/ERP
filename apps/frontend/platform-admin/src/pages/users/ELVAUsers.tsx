import { Link } from 'react-router-dom';

const ELVAUsers = () => {
  const platformAdmins = 0;
  const securityAdmins = 0;
  const technicalAdmins = 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ELVA Users</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Internal ELVA users</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Create platform users, assign ELVA roles and manage authorised cross-tenant access.
          </p>
        </div>

        {/* Role Counts */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-700">Platform Administrators</span>
            <span className="font-semibold text-gray-900 text-lg">{platformAdmins}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-700">Security Administrators</span>
            <span className="font-semibold text-gray-900 text-lg">{securityAdmins}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-gray-700">Technical Administrators</span>
            <span className="font-semibold text-gray-900 text-lg">{technicalAdmins}</span>
          </div>
        </div>

        {/* Action Button (Fully functional Link) */}
        <Link 
          to="/users/new"
          className="w-full bg-gray-900 text-white hover:bg-gray-800 py-3.5 rounded-xl text-sm font-semibold transition-colors block text-center"
        >
          Add ELVA user
        </Link>

      </div>
    </div>
  );
};

export default ELVAUsers;