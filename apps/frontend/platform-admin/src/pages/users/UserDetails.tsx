import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Shield, Calendar, UserCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getUserById } from '../../api/userApi';

const UserDetails = () => {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserById(id as string);
        setUser(data);
      } catch (error) {
        toast.error("Failed to load user details.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchUser();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading user details...</div>;
  if (!user) return <div className="p-8 text-center text-red-500">User not found.</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/users" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-500 mt-1">View internal ELVA user information.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.fullName}</h2>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
              user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {user.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Mail className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Work Email</p>
              <p className="font-medium text-gray-900">{user.workEmail}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Mobile Number</p>
              <p className="font-medium text-gray-900">{user.mobileNumber || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Platform Role</p>
              <p className="font-medium text-gray-900 capitalize">{user.platformRole.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Created On</p>
              <p className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <UserCheck className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="font-medium text-gray-900">{user.createdBy}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;