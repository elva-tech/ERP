import { useState } from 'react';
import Layout from './components/Layout';
import CreateInvite from './pages/CreateInvite/CreateInvite';
import Authentication from './pages/Authentication/Authentication';
import Sessions from './pages/Sessions/Sessions';
import Audit from './pages/Audit/Audit';

export default function App() {
  const [activeTab, setActiveTab] = useState('create'); 

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      
      
      {activeTab === 'create' && <CreateInvite />}
      {activeTab === 'auth' && <Authentication />}
      {activeTab === 'sessions' && <Sessions />}
      {activeTab === 'audit' && <Audit />}
      
      
      {activeTab === 'dashboard' && <div className="p-8 text-gray-500">Dashboard (Tanmayi's Work)</div>}
      {activeTab === 'directory' && <div className="p-8 text-gray-500">Identity Directory (Tanmayi's Work)</div>}
    </Layout>
  );
}