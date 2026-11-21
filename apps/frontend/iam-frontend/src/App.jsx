
import { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import IdentityDirectory from './pages/IdentityDirectory/IdentityDirectory';
import IdentityDetails from './pages/IdentityDetails/IdentityDetails';
import CreateInvite from './pages/CreateInvite/CreateInvite';
import Authentication from './pages/Authentication/Authentication';
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const handleLogin = () => {
    setActiveTab('dashboard');
    setIsLoggedIn(true);
  };
  const handleViewIdentity = (identity) => {
    setSelectedIdentity(identity);
    setActiveTab('details');
  };
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'create' && <CreateInvite />}
      {activeTab === 'auth' && <Authentication />}
      {activeTab === 'sessions' && <div className="p-8 text-gray-500">Sessions (Coming Soon)</div>}
      {activeTab === 'audit' && <div className="p-8 text-gray-500">Security Audit (Coming Soon)</div>}
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'directory' && <IdentityDirectory setActiveTab={setActiveTab} onViewIdentity={handleViewIdentity} />}
      {activeTab === 'details' && <IdentityDetails identity={selectedIdentity} setActiveTab={setActiveTab} />}
    </Layout>
  );
}
