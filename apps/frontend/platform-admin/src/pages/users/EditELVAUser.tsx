import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUserById, updateUser } from '../../api/userApi';

const EditELVAUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    mobileNumber: '',
    platformRole: 'PLATFORM_ADMIN'
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserById(id as string);
        setFormData({
          fullName: data.fullName,
          workEmail: data.workEmail,
          mobileNumber: data.mobileNumber || '',
          platformRole: data.platformRole
        });
      } catch (error) {
        toast.error("Failed to load user details.");
        navigate('/users');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchUser();
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser(id as string, formData);
      toast.success("User updated successfully!");
      navigate('/users');
    } catch (error: any) {
      toast.error(error.message || "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading user data...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/users" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit ELVA User</h1>
          <p className="text-gray-500 mt-1">Update user details and platform role.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
          <input 
            type="email" 
            name="workEmail" 
            required 
            value={formData.workEmail} 
            onChange={handleChange} 
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (Optional)</label>
          <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform Role *</label>
          <select name="platformRole" value={formData.platformRole} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="PLATFORM_ADMIN">Platform Administrator</option>
            <option value="SECURITY_ADMIN">Security Administrator</option>
            <option value="TECHNICAL_ADMIN">Technical Administrator</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link to="/users" className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default EditELVAUser;