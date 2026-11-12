import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateTenant = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Centralized state for all 5 steps
  const [formData, setFormData] = useState({
    // Step 1: Organisation
    tenantName: '',
    tenantCode: '',
    legalEntity: '',
    country: 'India',
    // Step 2: Regional
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    language: 'English',
    // Step 3: Modules
    modules: [] as string[],
    // Step 4: Admin
    adminName: '',
    adminEmail: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Module Dependency Logic
  const handleModuleToggle = (moduleName: string) => {
    setFormData(prev => {
      const isSelected = prev.modules.includes(moduleName);
      let newModules = isSelected 
        ? prev.modules.filter(m => m !== moduleName)
        : [...prev.modules, moduleName];
      
      // Dependency: If Payroll is selected, HR must be selected
      if (moduleName === 'Payroll' && !isSelected && !newModules.includes('HR Core')) {
        newModules.push('HR Core');
      }
      // Dependency: If HR is unselected, Payroll must be removed
      if (moduleName === 'HR Core' && isSelected && newModules.includes('Payroll')) {
        newModules = newModules.filter(m => m !== 'Payroll');
      }
      return { ...prev, modules: newModules };
    });
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Step Validity Checks
  const isStep1Valid = formData.tenantName.trim() !== '' && formData.tenantCode.trim() !== '';
  const isStep4Valid = formData.adminName.trim() !== '' && formData.adminEmail.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Tenant</h1>
          <p className="text-gray-500 mt-1">Set up a new customer on the ELVA platform.</p>
        </div>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Draft setup
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`h-1 rounded-full w-full ${currentStep >= step ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 text-sm font-medium">
          <div className={currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}>1. Organisation</div>
          <div className={currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}>2. Regional</div>
          <div className={currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}>3. Modules</div>
          <div className={currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}>4. Admin</div>
          <div className={currentStep >= 5 ? 'text-blue-600' : 'text-gray-400'}>5. Review</div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
        
        {/* STEP 1: Organisation Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Organisation details</h2>
              <p className="text-gray-500 text-sm mt-1">Enter the customer and primary legal entity details.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenant / organisation name *</label>
                <input type="text" name="tenantName" value={formData.tenantName} onChange={handleChange} placeholder="e.g. Apex Manufacturing Pvt Ltd" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenant code *</label>
                <input type="text" name="tenantCode" value={formData.tenantCode} onChange={handleChange} placeholder="e.g. APEX" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                <p className="text-xs text-gray-500 mt-1.5">Unique internal code. It cannot be reused by another tenant.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary legal entity</label>
                <input type="text" name="legalEntity" value={formData.legalEntity} onChange={handleChange} placeholder="Registered legal name" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Regional Settings */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Regional settings</h2>
              <p className="text-gray-500 text-sm mt-1">Configure the default localization for this tenant.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white">
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Currency</label>
                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                <select name="language" value={formData.language} onChange={handleChange} className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-white">
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Module Entitlements */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Module entitlements</h2>
              <p className="text-gray-500 text-sm mt-1">Select the ERP modules this tenant can access.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['HR Core', 'Payroll', 'Finance', 'Procurement'].map((mod) => (
                <div key={mod} 
                     onClick={() => handleModuleToggle(mod)}
                     className={`p-4 border rounded-xl cursor-pointer transition-all ${formData.modules.includes(mod) ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.modules.includes(mod) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {formData.modules.includes(mod) && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-900">{mod}</span>
                  </div>
                  {mod === 'Payroll' && <p className="text-xs text-gray-500 mt-2 ml-8">Requires HR Core</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Initial Tenant Admin */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Initial Tenant Administrator</h2>
              <p className="text-gray-500 text-sm mt-1">An invitation will be sent to this user to access the tenant.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Administrator Name *</label>
                <input type="text" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="e.g. John Doe" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Administrator Email *</label>
                <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} placeholder="e.g. john@apex.com" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Provisioning */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review and Provision</h2>
              <p className="text-gray-500 text-sm mt-1">Please review all details before triggering the provisioning engine.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500 block">Tenant Name</span><span className="font-medium">{formData.tenantName}</span></div>
                <div><span className="text-gray-500 block">Tenant Code</span><span className="font-medium">{formData.tenantCode}</span></div>
                <div><span className="text-gray-500 block">Legal Entity</span><span className="font-medium">{formData.legalEntity || 'N/A'}</span></div>
                <div><span className="text-gray-500 block">Country</span><span className="font-medium">{formData.country}</span></div>
                <div><span className="text-gray-500 block">Admin Email</span><span className="font-medium">{formData.adminEmail}</span></div>
                <div>
                  <span className="text-gray-500 block">Modules</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {formData.modules.map(m => <span key={m} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{m}</span>)}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
              Note: Clicking "Provision Tenant" will trigger asynchronous processes to create the database schema, S3 bucket, and KMS keys.
            </p>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-between items-center">
        <button 
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors border ${
            currentStep === 1 ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
        
        {currentStep < 5 ? (
          <button 
            onClick={nextStep}
            disabled={(currentStep === 1 && !isStep1Valid) || (currentStep === 4 && !isStep4Valid)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
              ((currentStep === 1 && !isStep1Valid) || (currentStep === 4 && !isStep4Valid))
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button 
            onClick={async () => {
              try {
                const response = await fetch('http://localhost:8080/api/tenants', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: formData.tenantName,
                    code: formData.tenantCode,
                    legalEntity: formData.legalEntity,
                    country: formData.country,
                    timezone: formData.timezone,
                    currency: formData.currency,
                    adminEmail: formData.adminEmail,
                    modules: formData.modules
                  })
                });
                
                if (response.ok) {
                  alert("Success! Tenant saved to the Neon database.");
                  window.location.href = '/tenants'; // Redirect to Tenant List
                } else {
                  const errorMsg = await response.text();
                  alert("Error: " + errorMsg);
                }
              } catch (error) {
                console.error(error);
                alert("Backend is not running. Did you start Spring Boot?");
              }
            }}
            className="px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Provision Tenant <CheckCircle2 size={16} />
          </button>
        )}
      </div>

    </div>
  );
};

export default CreateTenant;