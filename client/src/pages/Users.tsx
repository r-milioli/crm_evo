import React, { useState } from 'react';
import { 
  Plus, 
  User as UserIcon, 
  Shield, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  Key,
  Search,
  Filter,
  MoreVertical,
  Loader2,
  AlertCircle,
  Users as UsersIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import usersService, { User, CreateUserData, UpdateUserData } from '../services/usersService';
import UserModal from '../components/UserModal';

const Users: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Buscar usuários
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getUsers,
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: usersService.getUserStats
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Usuário criado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      usersService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Usuário atualizado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar usuário');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Usuário removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao remover usuário');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      usersService.toggleUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast.success('Status do usuário atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: usersService.resetUserPassword,
    onSuccess: (data) => {
      toast.success(`Senha redefinida! Nova senha: ${data.temporaryPassword}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao redefinir senha');
    }
  });

  // Handlers
  const handleCreateUser = async (data: CreateUserData) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (selectedUser) {
      await updateMutation.mutateAsync({ id: selectedUser.id, data });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await toggleStatusMutation.mutateAsync({ id: user.id, status: newStatus });
  };

  const handleResetPassword = async (id: string) => {
    if (window.confirm('Tem certeza que deseja redefinir a senha deste usuário?')) {
      await resetPasswordMutation.mutateAsync(id);
    }
  };

  const handleOpenModal = (user?: User, edit = false) => {
    setSelectedUser(user || null);
    setIsEditMode(edit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setIsEditMode(false);
  };

  // Função wrapper para o modal
  const handleSaveUser = async (data: CreateUserData | UpdateUserData) => {
    if (isEditMode) {
      await handleUpdateUser(data as UpdateUserData);
    } else {
      await handleCreateUser(data as CreateUserData);
    }
  };

  // Filtros
  const filteredUsers = users.filter((user) => {
    const userDepartments = user.userDepartments?.map(ud => ud.department.name).join(' ') || '';
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         userDepartments.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Funções auxiliares
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { label: 'Admin', color: 'bg-red-500' },
      MANAGER: { label: 'Gerente', color: 'bg-blue-500' },
      OPERATOR: { label: 'Operador', color: 'bg-green-500' },
      VIEWER: { label: 'Visualizador', color: 'bg-gray-500' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.VIEWER;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <Shield className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: 'Ativo', color: 'bg-green-500' },
      INACTIVE: { label: 'Inativo', color: 'bg-red-500' },
      PENDING: { label: 'Pendente', color: 'bg-yellow-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Nunca';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-gray-400">Gerencie os usuários da organização</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Usuários</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Ativos</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <Power className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inativos</p>
                <p className="text-2xl font-bold text-white">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-lg">
                <PowerOff className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500 rounded-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos os Status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
              <option value="PENDING">Pendentes</option>
            </select>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas as Funções</option>
              <option value="ADMIN">Administradores</option>
              <option value="MANAGER">Gerentes</option>
              <option value="OPERATOR">Operadores</option>
              <option value="VIEWER">Visualizadores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <span className="ml-2 text-gray-400">Carregando usuários...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-2 text-red-500">Erro ao carregar usuários</span>
        </div>
      )}

      {/* Lista de Usuários */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                  ? 'Nenhum usuário encontrado' 
                  : 'Nenhum usuário cadastrado'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie o primeiro usuário para começar'}
              </p>
              {!searchTerm && statusFilter === 'all' && roleFilter === 'all' && (
                <button 
                  onClick={() => handleOpenModal()}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Usuário
                </button>
              )}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-whatsapp-500 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                      <p className="text-sm text-gray-400">{user.email}</p>
                                             {user.phone && (
                         <p className="text-sm text-gray-400">{user.phone}</p>
                       )}
                       <div className="flex items-center space-x-2 mt-1">
                         {getRoleBadge(user.role)}
                         {getStatusBadge(user.status)}
                       </div>
                       {user.userDepartments && user.userDepartments.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-1">
                           {user.userDepartments.map((ud, index) => (
                             <span
                               key={ud.id}
                               className="text-xs px-2 py-1 rounded-full text-white"
                               style={{ backgroundColor: ud.department.color }}
                             >
                               {ud.department.name}
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Último login</p>
                      <p className="text-sm text-gray-300">{formatLastLogin(user.lastLogin)}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={toggleStatusMutation.isPending}
                        className={`p-2 rounded-md transition-colors ${
                          user.status === 'ACTIVE' 
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                            : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                        }`}
                        title={user.status === 'ACTIVE' ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {user.status === 'ACTIVE' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={resetPasswordMutation.isPending}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Redefinir senha"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleOpenModal(user, true)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded-md transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                        title="Remover usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

             {/* Modal */}
       <UserModal
         isOpen={isModalOpen}
         onClose={handleCloseModal}
         onSave={handleSaveUser}
         isLoading={createMutation.isPending || updateMutation.isPending}
         user={selectedUser}
         isEdit={isEditMode}
       />
    </div>
  );
};

export default Users;
