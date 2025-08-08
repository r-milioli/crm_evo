import React, { useState, useEffect } from 'react';
import { Bell, Shield, Globe, Database, Zap, CheckCircle, AlertCircle, Trash2, Building, Plus, Edit, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import settingsService, { TestConnectionResponse } from '../services/settingsService';
import departmentsService, { Department, CreateDepartmentData, UpdateDepartmentData } from '../services/departmentsService';
import DepartmentModal from '../components/DepartmentModal';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [evolutionConfig, setEvolutionConfig] = useState({
    baseUrl: '',
    apiKey: '',
    isConnected: false,
    isLoading: false
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  
  // Estados para departamentos
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEditDepartmentMode, setIsEditDepartmentMode] = useState(false);

  // Buscar configurações existentes
  const { data: existingConfig, isLoading: loadingConfig, error: configError } = useQuery({
    queryKey: ['evolution-config'],
    queryFn: settingsService.getEvolutionConfig
  });

  // Efeito para atualizar o estado quando as configurações são carregadas
  useEffect(() => {
    if (existingConfig) {
      setEvolutionConfig(prev => ({
        ...prev,
        baseUrl: existingConfig.baseUrl,
        isConnected: existingConfig.isConfigured
      }));
    }
  }, [existingConfig]);

  // Efeito para mostrar erro quando há falha
  useEffect(() => {
    if (configError) {
      toast.error('Erro ao carregar configurações');
    }
  }, [configError]);

  // Verificar status da conexão
  const { data: status } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: settingsService.getEvolutionStatus,
    enabled: !!existingConfig?.isConfigured,
    refetchInterval: 30000 // Verificar a cada 30 segundos
  });

  // Efeito para atualizar o status da conexão
  useEffect(() => {
    if (status) {
      setEvolutionConfig(prev => ({
        ...prev,
        isConnected: status.isConnected || false
      }));
    }
  }, [status]);

  // Buscar departamentos
  const { data: departments = [], isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getDepartments,
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Buscar estatísticas de departamentos
  const { data: departmentStats } = useQuery({
    queryKey: ['department-stats'],
    queryFn: departmentsService.getDepartmentStats
  });

  // Mutação para salvar configurações
  const saveConfigMutation = useMutation<
    { message: string; isConfigured: boolean },
    Error,
    { baseUrl: string; apiKey: string }
  >({
    mutationFn: ({ baseUrl, apiKey }) =>
      settingsService.saveEvolutionConfig(baseUrl, apiKey),
    onSuccess: (data: any) => {
      toast.success(data.message);
      setEvolutionConfig(prev => ({
        ...prev,
        isConnected: data.isConfigured,
        isLoading: false
      }));
      queryClient.invalidateQueries({ queryKey: ['evolution-config'] });
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
      setEvolutionConfig(prev => ({ ...prev, isLoading: false }));
    }
  });

  // Mutação para testar conexão
  const testConnectionMutation = useMutation<
    TestConnectionResponse,
    Error,
    { baseUrl: string; apiKey: string }
  >({
    mutationFn: ({ baseUrl, apiKey }) =>
      settingsService.testEvolutionConnection(baseUrl, apiKey),
    onSuccess: (data: TestConnectionResponse) => {
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Erro ao testar conexão');
      }
      setEvolutionConfig(prev => ({ ...prev, isLoading: false }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao testar conexão');
      setEvolutionConfig(prev => ({ ...prev, isLoading: false }));
    }
  });

  // Mutação para remover configurações
  const removeConfigMutation = useMutation<
    { message: string },
    Error,
    void
  >({
    mutationFn: settingsService.removeEvolutionConfig,
    onSuccess: (data: any) => {
      toast.success(data.message);
      setEvolutionConfig({
        baseUrl: '',
        apiKey: '',
        isConnected: false,
        isLoading: false
      });
      setTestResult(null);
      queryClient.invalidateQueries({ queryKey: ['evolution-config'] });
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao remover configurações');
    }
  });

  const handleEvolutionConfig = async () => {
    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      toast.error('Preencha todos os campos');
      return;
    }

    setEvolutionConfig(prev => ({ ...prev, isLoading: true }));
    saveConfigMutation.mutate({
      baseUrl: evolutionConfig.baseUrl,
      apiKey: evolutionConfig.apiKey
    });
  };

  const testConnection = async () => {
    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      toast.error('Preencha todos os campos');
      return;
    }

    setEvolutionConfig(prev => ({ ...prev, isLoading: true }));
    testConnectionMutation.mutate({
      baseUrl: evolutionConfig.baseUrl,
      apiKey: evolutionConfig.apiKey
    });
  };

  const handleRemoveConfig = () => {
    if (window.confirm('Tem certeza que deseja remover as configurações da Evolution API?')) {
      removeConfigMutation.mutate();
    }
  };

  // Mutations para departamentos
  const createDepartmentMutation = useMutation({
    mutationFn: departmentsService.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Departamento criado com sucesso!');
      setIsDepartmentModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar departamento');
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentData }) =>
      departmentsService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Departamento atualizado com sucesso!');
      setIsDepartmentModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar departamento');
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: departmentsService.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Departamento removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao remover departamento');
    }
  });

  // Handlers para departamentos
  const handleCreateDepartment = async (data: CreateDepartmentData) => {
    await createDepartmentMutation.mutateAsync(data);
  };

  const handleUpdateDepartment = async (data: UpdateDepartmentData) => {
    if (selectedDepartment) {
      await updateDepartmentMutation.mutateAsync({ id: selectedDepartment.id, data });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este departamento?')) {
      await deleteDepartmentMutation.mutateAsync(id);
    }
  };

  const handleOpenDepartmentModal = (department?: Department, edit = false) => {
    setSelectedDepartment(department || null);
    setIsEditDepartmentMode(edit);
    setIsDepartmentModalOpen(true);
  };

  const handleCloseDepartmentModal = () => {
    setIsDepartmentModalOpen(false);
    setSelectedDepartment(null);
    setIsEditDepartmentMode(false);
  };

  // Função wrapper para o modal de departamentos
  const handleSaveDepartment = async (data: CreateDepartmentData | UpdateDepartmentData) => {
    if (isEditDepartmentMode) {
      await handleUpdateDepartment(data as UpdateDepartmentData);
    } else {
      await handleCreateDepartment(data as CreateDepartmentData);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-gray-400">Configure seu sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evolution API Configuration */}
        <div className="card md:col-span-2">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Evolution API</h3>
              <p className="text-sm text-gray-400">Configure a conexão com a Evolution API</p>
            </div>
            <div className="flex items-center space-x-2">
              {loadingConfig ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : evolutionConfig.isConnected ? (
                <div className="flex items-center space-x-1 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Desconectado</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Base URL da API
                </label>
                <input
                  type="url"
                  placeholder="http://localhost:8080"
                  value={evolutionConfig.baseUrl}
                  onChange={(e) => setEvolutionConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="input w-full"
                  disabled={loadingConfig}
                />
                <p className="text-xs text-gray-400 mt-1">
                  URL base da sua Evolution API
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Sua API Key da Evolution"
                    value={evolutionConfig.apiKey}
                    onChange={(e) => setEvolutionConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="input w-full pr-10"
                    disabled={loadingConfig}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
                    disabled={loadingConfig}
                  >
                    {showApiKey ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Chave de API da Evolution API
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleEvolutionConfig}
                disabled={evolutionConfig.isLoading || !evolutionConfig.baseUrl || !evolutionConfig.apiKey || loadingConfig}
                className="btn btn-primary"
              >
                {evolutionConfig.isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {evolutionConfig.isLoading ? 'Configurando...' : 'Salvar Configuração'}
              </button>

              <button
                onClick={testConnection}
                disabled={evolutionConfig.isLoading || !evolutionConfig.baseUrl || !evolutionConfig.apiKey || loadingConfig}
                className="btn btn-secondary"
              >
                {evolutionConfig.isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {evolutionConfig.isLoading ? 'Testando...' : 'Testar Conexão'}
              </button>

              {existingConfig?.isConfigured && (
                <button
                  onClick={handleRemoveConfig}
                  disabled={evolutionConfig.isLoading || loadingConfig}
                  className="btn btn-danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </button>
              )}
            </div>

            {/* Resultado do teste */}
            {testResult && (
              <div className={`p-3 rounded-lg border ${
                testResult.success 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${
                    testResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResult.message}
                  </span>
                </div>
                {testResult.instances !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">
                    Instâncias encontradas: {testResult.instances}
                  </p>
                )}
                {testResult.details && (
                  <p className="text-xs text-gray-400 mt-1">
                    Detalhes: {testResult.details}
                  </p>
                )}
              </div>
            )}

            {/* Status da conexão */}
            {evolutionConfig.isConnected && !testResult && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-400">
                    Evolution API configurada com sucesso! O sistema está pronto para usar.
                  </span>
                </div>
                {status?.instances !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">
                    Instâncias ativas: {status.instances}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Notificações</h3>
          </div>
          <p className="text-gray-400 mb-4">Configure suas preferências de notificação</p>
          <button className="btn btn-secondary">Configurar</button>
        </div>

        {/* Departamentos */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Departamentos</h3>
                <p className="text-gray-400">Gerencie os departamentos da organização</p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenDepartmentModal()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Departamento
            </button>
          </div>

          {/* Estatísticas */}
          {departmentStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-white">{departmentStats.total}</p>
                  </div>
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Building className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Com Usuários</p>
                    <p className="text-2xl font-bold text-white">{departmentStats.withUsers}</p>
                  </div>
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Vazios</p>
                    <p className="text-2xl font-bold text-white">{departmentStats.empty}</p>
                  </div>
                  <div className="p-2 bg-gray-500 rounded-lg">
                    <Building className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Departamentos */}
          {loadingDepartments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <span className="ml-2 text-gray-400">Carregando departamentos...</span>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                Nenhum departamento cadastrado
              </h3>
              <p className="text-gray-500 mb-4">
                Crie o primeiro departamento para organizar seus usuários
              </p>
              <button 
                onClick={() => handleOpenDepartmentModal()}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Departamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((department) => (
                <div key={department.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: department.color || '#3B82F6' }}
                    />
                    <div>
                      <h4 className="font-medium text-white">{department.name}</h4>
                      {department.description && (
                        <p className="text-sm text-gray-400">{department.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {department._count?.users || 0} usuário{department._count?.users !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenDepartmentModal(department, true)}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded-md transition-colors"
                      title="Editar departamento"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDepartment(department.id)}
                      disabled={deleteDepartmentMutation.isPending}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                      title="Remover departamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Segurança</h3>
          </div>
          <p className="text-gray-400 mb-4">Configurações de segurança e privacidade</p>
          <button className="btn btn-secondary">Configurar</button>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Integrações</h3>
          </div>
          <p className="text-gray-400 mb-4">Configure integrações externas</p>
          <button className="btn btn-secondary">Configurar</button>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Backup</h3>
          </div>
          <p className="text-gray-400 mb-4">Configurações de backup e restauração</p>
          <button className="btn btn-secondary">Configurar</button>
        </div>
      </div>

      {/* Modal de Departamentos */}
      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={handleCloseDepartmentModal}
        onSave={handleSaveDepartment}
        isLoading={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
        department={selectedDepartment}
        isEdit={isEditDepartmentMode}
      />
    </div>
  );
};

export default Settings;
