import { useState } from 'react';
import Layout from './components/Layout';

// Matching your exact folder structure
import CreateInvite from './pages/CreateInvite/CreateInvite';
import Authentication from './pages/Authentication/Authentication';

export default function App() {
  const [activeTab, setActiveTab] = useState('create'); 

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* Tarun's Screens */}
      {activeTab === 'create' && <CreateInvite />}
      {activeTab === 'auth' && <Authentication />}
      
      {/* Placeholders for remaining screens */}
      {activeTab === 'sessions' && <div className="p-8 text-gray-500">Sessions (Coming Soon)</div>}
      {activeTab === 'audit' && <div className="p-8 text-gray-500">Security Audit (Coming Soon)</div>}
      
      {activeTab === 'dashboard' && <div className="p-8 text-gray-500">Dashboard (Tanmayi's Work)</div>}
      {activeTab === 'directory' && <div className="p-8 text-gray-500">Identity Directory (Tanmayi's Work)</div>}
    </Layout>
  );
}