import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CompanyRegister = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
    password: '',
    confirmPassword: '',
    terms: false
  });

  // Validation State
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [id]: val }));
    
    // Clear error when user types
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (formData.name.trim().length <= 1) newErrors.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = true;
    if (formData.phone.replace(/\D/g, "").length < 10) newErrors.phone = true;
    if (formData.address.trim().length <= 4) newErrors.address = true;
    if (formData.city.trim().length === 0) newErrors.city = true;
    if (formData.state.trim().length === 0) newErrors.state = true;
    if (!/^\d{6}$/.test(formData.pin)) newErrors.pin = true;
    if (formData.password.length < 8) newErrors.password = true;
    if (formData.password !== formData.confirmPassword || formData.confirmPassword.length === 0) newErrors.confirmPassword = true;
    if (!formData.terms) newErrors.terms = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsLoading(true);
    try {
      // POST request to backend
      const response = await fetch('http://localhost:8080/api/tenants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pin: formData.pin,
          country: formData.country,
          password: formData.password
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Registration successful!");
      } else {
        const errorText = await response.text();
        toast.error(errorText || "Registration failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  // Success View
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration received</h2>
          <p className="text-gray-500 mb-6">
            We've sent a verification link to <strong className="text-gray-800">{formData.email}</strong>.
          </p>
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  // Form View
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Register your company</h1>
          <p className="text-gray-500 text-sm">Create your company account to start using the ELVA ERP.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Company Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input 
              id="name" type="text" placeholder="Acme Industries Pvt Ltd"
              value={formData.name} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">Enter your company name.</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Company email</label>
            <input 
              id="email" type="email" placeholder="info@acme.com"
              value={formData.email} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">Enter a valid email address.</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input 
              id="phone" type="tel" placeholder="+91 98765 43210"
              value={formData.phone} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">Enter a valid phone number.</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Company address</label>
            <textarea 
              id="address" placeholder="Street, area" rows={2}
              value={formData.address} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${errors.address ? 'border-red-500' : 'border-gray-300'}`} 
            ></textarea>
            {errors.address && <p className="text-red-500 text-xs mt-1">Enter your company address.</p>}
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input 
                id="city" type="text"
                value={formData.city} onChange={handleChange}
                className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.city ? 'border-red-500' : 'border-gray-300'}`} 
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">Required.</p>}
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input 
                id="state" type="text"
                value={formData.state} onChange={handleChange}
                className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.state ? 'border-red-500' : 'border-gray-300'}`} 
              />
              {errors.state && <p className="text-red-500 text-xs mt-1">Required.</p>}
            </div>
          </div>

          {/* PIN & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">PIN code</label>
              <input 
                id="pin" type="text" maxLength={6} placeholder="400001"
                value={formData.pin} onChange={handleChange}
                className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.pin ? 'border-red-500' : 'border-gray-300'}`} 
              />
              {errors.pin && <p className="text-red-500 text-xs mt-1">Enter a 6-digit PIN.</p>}
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select 
                id="country" value={formData.country} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              >
                <option value="India">India</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Passwords */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              id="password" type="password" placeholder="At least 8 characters"
              value={formData.password} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">Use at least 8 characters.</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input 
              id="confirmPassword" type="password"
              value={formData.confirmPassword} onChange={handleChange}
              className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} 
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">Passwords don't match.</p>}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2 mt-4">
            <input 
              id="terms" type="checkbox" 
              checked={formData.terms} onChange={handleChange}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the <a href="#" className="text-blue-600 hover:underline">Terms</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </label>
          </div>
          {errors.terms && <p className="text-red-500 text-xs">Accept the terms to continue.</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors mt-6 ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Registering...' : 'Register company'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already registered? <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
          </p>

        </form>
      </div>
    </div>
  );
};

export default CompanyRegister;