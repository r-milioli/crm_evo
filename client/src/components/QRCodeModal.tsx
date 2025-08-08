import React, { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceName: string;
  qrCode?: string;
  status?: string;
  onRefresh?: () => void;
  onReopen?: () => void;
  isLoading?: boolean;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  instanceName,
  qrCode,
  status,
  onRefresh,
  onReopen,
  isLoading = false
}) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (isOpen && qrCode) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, qrCode]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(60);
    }
  }, [isOpen]);





  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Escaneie o QR Code com seu WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center space-x-2">
            {status === 'CONNECTED' ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : status === 'ERROR' ? (
              <AlertCircle className="text-red-500" size={20} />
            ) : (
              <AlertCircle className="text-yellow-500" size={20} />
            )}
            <span className="text-white">
              {status === 'CONNECTED' ? 'Conectado' : 
               status === 'ERROR' ? 'Erro de Conexão' : 
               status === 'QRCODE' ? 'Aguardando Conexão' : 
               status === 'CONNECTING' ? 'Conectando...' : 'Status Desconhecido'}
            </span>
          </div>

          {status === 'ERROR' && (
            <p className="text-red-400 text-sm">
              Não foi possível determinar o status.
            </p>
          )}

          {/* QR Code */}
          {qrCode && status !== 'CONNECTED' && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-40 h-40"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Timer */}
              {timeLeft > 0 && (
                <p className="text-gray-300 text-sm mt-2">
                  QR Code expira em: {timeLeft}s
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          {qrCode && status !== 'CONNECTED' && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Como conectar:</h3>
              <ol className="text-gray-300 text-sm space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em Menu → WhatsApp Web</li>
                <li>3. Aponte a câmera para o QR Code acima</li>
              </ol>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span>Atualizar</span>
              </button>
            )}
            
            {onReopen && status === 'QRCODE' && (
              <button
                onClick={onReopen}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
              >
                <RefreshCw size={16} />
                <span>Reabrir QR Code</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;

