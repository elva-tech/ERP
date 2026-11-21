import { useState } from 'react';
import Layout from './components/Layout';

export default function App() {
  // Setting default to 'create' since that's your first screen
  const [activeTab, setActiveTab] = useState('create'); 

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* This is just a placeholder to prove the menu works */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          This is the {activeTab} page
        </h2>
        <p className="text-gray-500">Clicking the menu on the left changes this text.</p>
      </div>
    </Layout>
  );
}