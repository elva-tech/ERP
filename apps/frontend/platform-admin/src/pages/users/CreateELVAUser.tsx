import { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createUser } from '../../api/userApi';
import toast from 'react-hot-toast';

const CreateELVAUser = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    mobileNumber: '',
    platformRole: 'PLATFORM_ADMIN'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createUser(formData);
      // Updated success message per PRD Section 8
      toast.success("ELVA platform user created. Invitation status: Pending.");
      navigate('/users');
    } catch (error: any) {
      toast.error(error.message || "Failed to create user.");
    } finally {
      setIsLoading(false);
    }
  };

  // PRD Section 5.3: Access Summary Logic
  const getAccessSummary = () => {
    switch (formData.platformRole) {
      case 'PLATFORM_ADMIN':
        return ['Dashboard', 'Tenant Management', 'Module Entitlements', 'ELVA Users', 'Integrations & APIs', 'Security & Audit', 'Platform Operations', 'Shared Services'];
      case 'SECURITY_ADMIN':
        return ['Dashboard', 'Security & Audit'];
      case 'TECHNICAL_ADMIN':
        return ['Dashboard', 'Platform Operations', 'Integrations & APIs'];
      default:
        return [];
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/users" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add ELVA User</h1>
          <p className="text-gray-500 mt-1">Create an internal platform administrator.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
        
        {/* Personal Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
            <input type="email" name="workEmail" required value={formData.workEmail} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (Optional)</label>
            <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Role Selection & Access Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">ELVA Platform Role</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Role *</label>
            <select name="platformRole" value={formData.platformRole} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500">
              <option value="PLATFORM_ADMIN">Platform Administrator</option>
              <option value="SECURITY_ADMIN">Security Administrator</option>
              <option value="TECHNICAL_ADMIN">Technical Administrator</option>
            </select>
          </div>

          {/* Read-only Access Summary */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Default Access for this Role:</p>
            <div className="flex flex-wrap gap-2">
              {getAccessSummary().map((area) => (
                <span key={area} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md">
                  <CheckCircle2 size={12} className="text-green-500" />
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Invitation Notice */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
          <strong>Note:</strong> An invitation will be sent to the user via ELVA IAM. You do not need to set a password here.
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link to="/users" className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {isLoading ? 'Creating...' : 'Create & Send Invite'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateELVAUser;