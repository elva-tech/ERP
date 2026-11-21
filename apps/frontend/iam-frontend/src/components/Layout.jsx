import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Make sure these match your component names exactly */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar activeTab={activeTab} />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}