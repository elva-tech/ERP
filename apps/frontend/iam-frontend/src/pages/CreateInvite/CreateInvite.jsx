import { Info } from 'lucide-react';

export default function CreateInvite() {
  return (
    <div className="max-w-[1100px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create / Invite Identity</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new user or invite an existing user</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Form Card */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form className="space-y-6">
            
            {/* Name Input */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-full sm:w-48 text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter full name"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Email Input */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-full sm:w-48 text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                Email <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                placeholder="user@elva.com"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Phone Input */}
            <div className="flex flex-col sm:flex-row sm:items-center">
              <label className="w-full sm:w-48 text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                Phone (Optional)
              </label>
              <input 
                type="text" 
                placeholder="+91 98765 43210"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Checkboxes */}
            <div className="sm:pl-48 space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Send invitation email</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Set initial password (optional)</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="sm:pl-48 pt-6 flex gap-4">
              <button type="button" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm bg-white">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Invite User
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Info Box */}
        <div className="w-full lg:w-80 bg-[#EFF6FF] rounded-xl p-6 h-fit border border-blue-100 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="text-[#2563EB] shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Before creating...</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                We will check if the email already has an ELVA identity to avoid duplicates.
              </p>
              <button className="mt-4 px-4 py-2 bg-white border border-[#2563EB] text-[#2563EB] rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm">
                Check Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}