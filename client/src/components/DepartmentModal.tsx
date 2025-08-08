import React, { useState, useEffect } from 'react';
import { X, Save, Building, Palette } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Department, CreateDepartmentData, UpdateDepartmentData } from '../services/departmentsService';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateDepartmentData | UpdateDepartmentData) => Promise<void>;
  isLoading: boolean;
  department?: Department | null;
  isEdit?: boolean;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
  department,
  isEdit = false
}) => {
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: '',
    description: '',
    color: '#3B82F6' // Cor padrão azul
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cores predefinidas para escolha
  const predefinedColors = [
    '#3B82F6', // Azul
    '#10B981', // Verde
    '#F59E0B', // Amarelo
    '#EF4444', // Vermelho
    '#8B5CF6', // Roxo
    '#F97316', // Laranja
    '#06B6D4', // Ciano
    '#84CC16', // Verde lima
    '#EC4899', // Rosa
    '#6B7280', // Cinza
  ];

  // Atualizar formData quando department mudar (modo edição)
  useEffect(() => {
    if (department && isEdit) {
      setFormData({
        name: department.name,
        description: department.description || '',
        color: department.color || '#3B82F6'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6'
      });
    }
    setErrors({});
  }, [department, isEdit]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEdit && department) {
        // Modo edição
        const updateData: UpdateDepartmentData = {
          name: formData.name,
          description: formData.description,
          color: formData.color
        };
        await onSave(updateData);
      } else {
        // Modo criação
        await onSave(formData);
      }
    } catch (error) {
      // Erro será tratado pelo componente pai
    }
  };

  const handleInputChange = (field: keyof CreateDepartmentData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? 'Editar Departamento' : 'Novo Departamento'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Departamento *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Ex: Suporte Técnico"
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-4 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Descrição opcional do departamento..."
              rows={3}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Cor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cor do Departamento
            </label>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-8 h-8 rounded-md border-2 transition-all ${
                        formData.color === color
                          ? 'border-white scale-110'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Atualizar' : 'Criar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;
