import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Sidebar - fixa */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Conteúdo principal - com scroll */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - fixo */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Conteúdo da página - com scroll */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
