import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, MapPin, Mail, CheckCircle2, Clock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  code: string;
  legalEntity: string;
  country: string;
  timezone: string;
  currency: string;
  adminEmail: string;
  status: string;
  createdAt: string;
}

const TenantDetails = () => {
  const { id } = useParams(); // Gets the ID from the URL
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/tenants/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTenant(data);
        }
      } catch (error) {
        console.error("Failed to fetch tenant", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/tenants/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        const updatedTenant = await response.json();
        setTenant(updatedTenant); // Update the UI instantly
      } else {
        alert("Failed to update status.");
      }
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend.");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading tenant details...</div>;
  if (!tenant) return <div className="p-8 text-center text-red-500">Tenant not found.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link to="/tenants" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-gray-500 mt-1">Tenant ID: {tenant.code}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
            tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
            tenant.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {tenant.status === 'ACTIVE' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
            {tenant.status}
          </span>

          {/* Dynamic Action Buttons based on status */}
          {tenant.status === 'PROVISIONING' && (
            <button 
              onClick={() => handleStatusChange('ACTIVE')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Activate Tenant
            </button>
          )}

          {tenant.status === 'ACTIVE' && (
            <button 
              onClick={() => handleStatusChange('SUSPENDED')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Suspend Tenant
            </button>
          )}

          {tenant.status === 'SUSPENDED' && (
            <button 
              onClick={() => handleStatusChange('ACTIVE')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Reinstate Tenant
            </button>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4">Organisation Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
          <div className="flex items-start gap-3">
            <Building2 className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Legal Entity</p>
              <p className="font-medium text-gray-900">{tenant.legalEntity || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Country</p>
              <p className="font-medium text-gray-900">{tenant.country}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Primary Admin Email</p>
              <p className="font-medium text-gray-900">{tenant.adminEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Created On</p>
              <p className="font-medium text-gray-900">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mt-10 mb-6 border-b border-gray-100 pb-4">Regional Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
          <div>
            <p className="text-sm text-gray-500">Timezone</p>
            <p className="font-medium text-gray-900">{tenant.timezone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Primary Currency</p>
            <p className="font-medium text-gray-900">{tenant.currency}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TenantDetails;