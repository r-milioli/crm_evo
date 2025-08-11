import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Instance, CreateInstanceData } from '../services/instancesService';

interface InstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateInstanceData) => Promise<void>;
  instance?: Instance | null;
  isLoading?: boolean;
}

const InstanceModal: React.FC<InstanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  instance,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateInstanceData>({
    name: '',
    instanceName: '',
    description: '',
    webhookEvents: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name,
        instanceName: instance.instanceName,
        description: instance.description || '',
        webhookEvents: instance.webhookEvents || []
      });
    } else {
      setFormData({
        name: '',
        instanceName: '',
        description: '',
        webhookEvents: []
      });
    }
    setErrors({});
  }, [instance, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.instanceName.trim()) {
      newErrors.instanceName = 'Nome da instância é obrigatório';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.instanceName)) {
      newErrors.instanceName = 'Nome da instância deve conter apenas letras, números, hífens e underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar instância:', error);
      
      // Mostrar erro específico se disponível
      if (error.response?.data?.error) {
        setErrors({ submit: error.response.data.error });
      } else if (error.response?.data?.details) {
        setErrors({ submit: `${error.response.data.error || 'Erro'}: ${error.response.data.details}` });
      } else {
        setErrors({ submit: 'Erro ao criar instância. Verifique a configuração da Evolution API.' });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {instance ? 'Editar Instância' : 'Nova Instância'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Instância *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Ex: WhatsApp Principal"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Nome da Instância */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome Técnico *
            </label>
            <input
              type="text"
              name="instanceName"
              value={formData.instanceName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.instanceName ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Ex: instance-1"
            />
            {errors.instanceName && (
              <p className="text-red-500 text-sm mt-1">{errors.instanceName}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Apenas letras, números, hífens e underscores
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Descrição da instância..."
            />
          </div>



          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-900 border border-red-700 rounded-md p-3">
              <p className="text-red-300 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {instance ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstanceModal;
