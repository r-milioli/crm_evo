import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  Users, 
  Phone, 
  BarChart3, 
  Settings, 
  Megaphone,
  Trello,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/instances', icon: Phone, label: 'Instâncias' },
    { path: '/conversations', icon: MessageCircle, label: 'Conversas' },
    { path: '/contacts', icon: Users, label: 'Contatos' },
    { path: '/campaigns', icon: Megaphone, label: 'Campanhas' },
    { path: '/kanbans', icon: Trello, label: 'Kanbans' },
    { path: '/reports', icon: BarChart3, label: 'Relatórios' },
    { path: '/users', icon: Users, label: 'Usuários' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-gray-900 lg:bg-gray-900/40 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:w-64 lg:h-full lg:flex-shrink-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 lg:border-gray-800/40 flex-shrink-0 h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">CRM Evolution</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-gray-800 lg:hover:bg-gray-900/40 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 lg:hover:bg-gray-900/40 hover:text-white'
                  }
                `}
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
