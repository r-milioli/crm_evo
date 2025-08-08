import React from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-gray-900/40 border-b border-gray-800/40 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-gray-900/40 text-gray-300 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex-1 lg:flex-none">
          <h1 className="text-lg font-semibold text-white">CRM Evolution</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 rounded-md hover:bg-gray-900/40 relative">
            <Bell className="w-5 h-5 text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-900/40">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-300 hidden md:block">
                {user?.name || 'Usuário'}
              </span>
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-gray-900/50 border border-gray-800/40 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-800/40">
                  {user?.email}
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
