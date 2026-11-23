import { useState } from 'react';
import Layout from './components/Layout';

import CreateInvite from './pages/CreateInvite/CreateInvite';
import Authentication from './pages/Authentication/Authentication';
import Sessions from './pages/Sessions/Sessions';
import Audit from './pages/Audit/Audit';


import Login from './pages/Login/Login'; 
import Dashboard from './pages/Dashboard/Dashboard';
import IdentityDirectory from './pages/IdentityDirectory/IdentityDirectory';
import IdentityDetails from './pages/IdentityDetails/IdentityDetails';

export default function App() {
  
  const [activeTab, setActiveTab] = useState('create'); 

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      
     
      {activeTab === 'create' && <CreateInvite />}
      {activeTab === 'auth' && <Authentication />}
      {activeTab === 'sessions' && <Sessions />}
      {activeTab === 'audit' && <Audit />}
      
      
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'directory' && <IdentityDirectory />}
      {activeTab === 'details' && <IdentityDetails />}
      
    </Layout>
  );
}