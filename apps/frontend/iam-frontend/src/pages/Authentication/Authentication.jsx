import { ShieldCheck } from 'lucide-react';

export default function Authentication() {
  return (
    <div className="max-w-[1100px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Authentication & Security</h1>
        <p className="text-sm text-gray-500 mt-1">Configure global security policies</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button className="px-6 py-3 text-sm font-semibold text-[#2563EB] border-b-2 border-[#2563EB]">
          Password Policy
        </button>
        <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
          MFA Settings
        </button>
        <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
          Session Policy
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Form Card */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form className="space-y-8">
            
            {/* Minimum Length */}
            <div className="flex items-center">
              <label className="w-64 text-sm font-medium text-gray-700">
                Minimum Length
              </label>
              <input 
                type="number" 
                defaultValue="8"
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Require Special Character (Toggle) */}
            <div className="flex items-center">
              <label className="w-64 text-sm font-medium text-gray-700">
                Require Special Character
              </label>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
              </div>
            </div>

            {/* Password Expiry */}
            <div className="flex items-center">
              <label className="w-64 text-sm font-medium text-gray-700">
                Password Expiry
              </label>
              <select className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>30 Days</option>
                <option>60 Days</option>
                <option defaultValue>90 Days</option>
                <option>Never</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-4">
              <button type="submit" className="px-6 py-2.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Save Changes
              </button>
              <button type="button" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm bg-white">
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Info Box */}
        <div className="w-full lg:w-80 bg-[#EFF6FF] rounded-xl p-8 h-fit border border-blue-100 shadow-sm flex flex-col items-center text-center">
          <ShieldCheck className="text-green-500 mb-4" size={48} />
          <h3 className="font-semibold text-gray-800 text-sm">MFA is enabled for all users</h3>
          <button className="mt-6 px-6 py-2 bg-white border border-[#2563EB] text-[#2563EB] rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm w-full">
            Update Settings
          </button>
        </div>
      </div>
    </div>
  );
}