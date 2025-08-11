import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';

interface NewMessageNotificationProps {
  message: string;
  onClose: () => void;
  autoHide?: boolean;
  duration?: number;
}

const NewMessageNotification: React.FC<NewMessageNotificationProps> = ({
  message,
  onClose,
  autoHide = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Aguardar animação terminar
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 animate-pulse" />
          <div className="flex-1">
            <p className="font-medium">Nova Mensagem</p>
            <p className="text-sm opacity-90">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewMessageNotification;
