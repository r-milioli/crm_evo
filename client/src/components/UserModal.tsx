import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Lock, Phone, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { User as UserType, CreateUserData, UpdateUserData } from '../services/usersService';
import departmentsService, { Department } from '../services/departmentsService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserData | UpdateUserData) => Promise<void>;
  isLoading: boolean;
  user?: UserType | null;
  isEdit?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
  user,
  isEdit = false
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    phone: '',
    department: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar departamentos
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getDepartments
  });

  // Atualizar formData quando user mudar (modo edição)
  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Não preencher senha em edição
        role: user.role,
        phone: user.phone || '',
        department: user.department || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'OPERATOR',
        phone: '',
        department: ''
      });
    }
    setErrors({});
  }, [user, isEdit]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!isEdit && !formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (!isEdit && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
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
      if (isEdit && user) {
        // Modo edição - remover senha se estiver vazia
        const updateData: UpdateUserData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          department: formData.department
        };
        await onSave(updateData);
      } else {
        // Modo criação
        await onSave(formData);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleInputChange = (field: keyof CreateUserData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'OPERATOR',
      phone: '',
      department: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const roleOptions = [
    { value: 'ADMIN', label: 'Administrador', description: 'Acesso total ao sistema' },
    { value: 'MANAGER', label: 'Gerente', description: 'Gerencia equipes e projetos' },
    { value: 'OPERATOR', label: 'Operador', description: 'Opera instâncias e conversas' },
    { value: 'VIEWER', label: 'Visualizador', description: 'Apenas visualização' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Digite o nome completo"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="usuario@empresa.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Senha (apenas na criação) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Telefone (Opcional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Departamento (Opcional)
            </label>
            <select
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecione um departamento</option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
            {departments.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">
                Nenhum departamento cadastrado. Crie departamentos em Configurações.
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Função
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              A função determina as permissões do usuário no sistema
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Atualizar' : 'Criar Usuário'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
