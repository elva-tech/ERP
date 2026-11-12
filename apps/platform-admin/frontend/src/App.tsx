import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// --- UPDATED IMPORTS ---
import Dashboard from './pages/dashboard/Dashboard';
import TenantManagement from './pages/tenants/TenantManagement';
import CreateTenant from './pages/tenants/CreateTenant';
import TenantDetails from './pages/tenants/TenantDetails';
import ModuleEntitlements from './pages/modules/ModuleEntitlements';
import ELVAUsers from './pages/users/ELVAUsers';
import CreateELVAUser from './pages/users/CreateELVAUser';
import IntegrationsAPIs from './pages/integrations/IntegrationsAPIs';
import IntegrationFeaturePlaceholder from './pages/integrations/IntegrationFeaturePlaceholder';
import SecurityAudit from './pages/security/SecurityAudit';
import SecurityFeaturePlaceholder from './pages/security/SecurityFeaturePlaceholder';
import PlatformOperations from './pages/operations/PlatformOperations';
import OperationsFeaturePlaceholder from './pages/operations/OperationsFeaturePlaceholder';
import SharedServices from './pages/services/SharedServices';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          
          {/* ADDED: scrollbar-hide class here */}
          <main className="p-6 overflow-y-auto scrollbar-hide">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tenants" element={<TenantManagement />} />
              <Route path="/tenants/new" element={<CreateTenant />} />
              <Route path="/tenants/:id" element={<TenantDetails />} />
              <Route path="/modules" element={<ModuleEntitlements />} />
              <Route path="/integrations" element={<IntegrationsAPIs />} />
              <Route path="/users" element={<ELVAUsers />} />
              <Route path="/users/new" element={<CreateELVAUser />} />
              <Route path="/integrations/*" element={<IntegrationFeaturePlaceholder />} />
              <Route path="/security" element={<SecurityAudit />} />
              <Route path="/security/*" element={<SecurityFeaturePlaceholder />} />
              <Route path="/operations" element={<PlatformOperations />} />
              <Route path="/operations/*" element={<OperationsFeaturePlaceholder />} />
              <Route path="/services" element={<SharedServices />} />
            </Routes>
          </main>

        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;