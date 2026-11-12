const SharedServices = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared Services</h1>
        <p className="text-gray-500 mt-1">ELVA Platform Admin workspace</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        
        {/* Card Header */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-900">ELVA shared services</h2>
        </div>

        {/* Services List */}
        <div className="flex flex-col">
          
          {/* ELVA Notify */}
          <div className="flex justify-between items-start py-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">ELVA Notify</h3>
              <p className="text-gray-500 text-sm mt-1">Notifications and integrations</p>
            </div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
              Connected
            </span>
          </div>

          {/* ELVA Document Service */}
          <div className="flex justify-between items-start py-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">ELVA Document Service</h3>
              <p className="text-gray-500 text-sm mt-1">Private tenant document storage</p>
            </div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
              Connected
            </span>
          </div>

        </div>

        {/* Footer Note */}
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Manage service configuration, availability, integration health and operational history.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SharedServices;