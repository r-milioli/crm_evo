import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  QrCode, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Loader2, 
  Settings,
  AlertCircle 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import instancesService from '../services/instancesService';
import InstanceModal from '../components/InstanceModal';
import QRCodeModal from '../components/QRCodeModal';
import InstanceSettingsModal from '../components/InstanceSettingsModal';
import { Instance, CreateInstanceData } from '../services/instancesService';

const Instances: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode?: string; status?: string }>({});
  const [loadingInstances, setLoadingInstances] = useState<Set<string>>(new Set());

  // Buscar instâncias
  const { data: instancesData, isLoading, error } = useQuery({
    queryKey: ['instances'],
    queryFn: instancesService.getInstances,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    refetchIntervalInBackground: false, // Não atualizar quando a aba não está ativa
    retry: 3, // Tentar apenas 3 vezes em caso de erro
    retryDelay: 5000 // Esperar 5 segundos entre tentativas
  });

  // Garantir que instances seja sempre um array
  const instances = useMemo(() => {
    return Array.isArray(instancesData) ? instancesData : [];
  }, [instancesData]);

  // Debug logs
  console.log('Instances Debug:', {
    instancesData,
    isLoading,
    error,
    instancesLength: instances.length,
    isArray: Array.isArray(instancesData)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: instancesService.createInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success('Instância criada com sucesso!');
      setIsCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar instância');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: instancesService.deleteInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success('Instância removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao remover instância');
    }
  });

  const connectMutation = useMutation({
    mutationFn: instancesService.connectInstance,
    onMutate: (instanceId: string) => {
      setLoadingInstances(prev => new Set(prev).add(instanceId));
    },
    onSuccess: (data: any, instanceId: string) => {
      setQrCodeData({
        qrCode: data.qrCode,
        status: data.status || 'QRCODE'
      });
      setIsQRModalOpen(true);
      toast.success('QR Code gerado com sucesso!');
      
      // Atualizar a lista de instâncias após gerar o QR Code
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error: any, instanceId: string) => {
      console.error('Erro na conexão:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar QR Code');
    },
    onSettled: (data, error, instanceId: string) => {
      setLoadingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceId);
        return newSet;
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: instancesService.disconnectInstance,
    onMutate: (instanceId: string) => {
      setLoadingInstances(prev => new Set(prev).add(instanceId));
    },
    onSuccess: (data, instanceId: string) => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success('Instância desconectada com sucesso!');
    },
    onError: (error: any, instanceId: string) => {
      toast.error(error.response?.data?.error || 'Erro ao desconectar instância');
    },
    onSettled: (data, error, instanceId: string) => {
      setLoadingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceId);
        return newSet;
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: instancesService.syncEvolutionInstances,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      toast.success(data.message || 'Instâncias sincronizadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao sincronizar instâncias');
    }
  });

  // Testar configuração da Evolution API
  const testConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/settings/test-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao testar configuração');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Teste de configuração:', data);
      toast.success('Configuração da Evolution API está funcionando!');
    },
    onError: (error: any) => {
      console.error('Erro no teste de configuração:', error);
      toast.error(error.message || 'Erro ao testar configuração');
    }
  });

  // Polling para verificar status das instâncias a cada 10 segundos
  useEffect(() => {
    // Só fazer polling se houver instâncias com status QRCODE ou CONNECTING
    const activeInstances = instances.filter((instance: Instance) => 
      instance.status === 'QRCODE' || instance.status === 'CONNECTING'
    );
    
    if (activeInstances.length === 0) {
      return; // Não fazer polling se não há instâncias ativas
    }

    const interval = setInterval(() => {
      // Verificar se ainda há instâncias ativas antes de invalidar
      const currentActiveInstances = instances.filter((instance: Instance) => 
        instance.status === 'QRCODE' || instance.status === 'CONNECTING'
      );
      
      if (currentActiveInstances.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['instances'] });
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [instances, queryClient]);

  // Handlers
  const handleCreateInstance = async (data: CreateInstanceData) => {
    await createMutation.mutateAsync(data);
  };

  const handleDeleteInstance = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta instância?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleConnectInstance = async (id: string) => {
    // Encontrar a instância selecionada
    const instance = instances.find((i: Instance) => i.id === id);
    if (instance) {
      setSelectedInstance(instance);
    }
    await connectMutation.mutateAsync(id);
  };

  const handleDisconnectInstance = async (id: string) => {
    await disconnectMutation.mutateAsync(id);
  };

  const handleRefreshQR = async () => {
    if (selectedInstance) {
      await connectMutation.mutateAsync(selectedInstance.id);
    }
  };

  const handleReconnectInstance = async (instance: Instance) => {
    setSelectedInstance(instance);
    await connectMutation.mutateAsync(instance.id);
  };



  const handleCloseQRModal = () => {
    setIsQRModalOpen(false);
    setQrCodeData({});
    
    // Atualizar a lista de instâncias quando o modal for fechado
    queryClient.invalidateQueries({ queryKey: ['instances'] });
    
    // Se a instância ainda está com status QRCODE, mostrar notificação
    if (selectedInstance && selectedInstance.status === 'QRCODE') {
      toast.success('Modal fechado. Use o botão "Reconectar" para gerar um novo QR Code quando necessário.');
    }
  };

  const handleOpenSettingsModal = (instance: Instance) => {
    setSelectedInstance(instance);
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setSelectedInstance(null);
  };

  const getStatusBadge = (instance: Instance) => {
    // Se tem connectionStatus da Evolution API, usar ele para determinar o status
    if (instance.connectionStatus) {
      switch (instance.connectionStatus) {
        case 'open':
          return <span className="badge badge-success">Conectado</span>;
        case 'close':
          return <span className="badge badge-error">Desconectado</span>;
        case 'connecting':
          return <span className="badge badge-warning">Conectando...</span>;
        default:
          break;
      }
    }
    
    // Fallback para o status original
    switch (instance.status) {
      case 'CONNECTED':
        return <span className="badge badge-success">Conectado</span>;
      case 'DISCONNECTED':
        return <span className="badge badge-error">Desconectado</span>;
      case 'CONNECTING':
        return <span className="badge badge-warning">Conectando...</span>;
      case 'QRCODE':
        return <span className="badge badge-info">QR Code</span>;
      default:
        return <span className="badge badge-secondary">Desconhecido</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'DISCONNECTED':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      case 'CONNECTING':
        return <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
      case 'QRCODE':
        return <QrCode className="w-5 h-5 text-blue-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Instâncias WhatsApp</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="btn btn-secondary"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar
          </button>
                     <button
             onClick={() => testConfigMutation.mutate()}
             disabled={testConfigMutation.isPending}
             className="btn btn-secondary"
           >
             {testConfigMutation.isPending ? (
               <Loader2 className="w-4 h-4 animate-spin mr-2" />
             ) : (
               <Settings className="w-4 h-4 mr-2" />
             )}
             Testar Config
           </button>
           
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Instância
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <span className="ml-2 text-gray-400">Carregando instâncias...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-2 text-red-500">Erro ao carregar instâncias</span>
        </div>
      )}

      {/* Instâncias */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instances.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <QrCode className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhuma instância encontrada</h3>
              <p className="text-gray-500 mb-4">Crie sua primeira instância do WhatsApp para começar</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Instância
              </button>
            </div>
          ) : (
            instances.map((instance: Instance) => (
              <div key={instance.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(instance.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-white">{instance.name}</h3>
                      <p className="text-sm text-gray-400">{instance.instanceName}</p>
                    </div>
                  </div>
                  {getStatusBadge(instance)}
                </div>

                <p className="text-gray-400 mb-4">{instance.description || 'Sem descrição'}</p>
                 
                {instance.isFromEvolution && (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Evolution API
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Criada em: {new Date(instance.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="flex space-x-2">
                  {instance.status === 'DISCONNECTED' && (
                    <button 
                      onClick={() => handleConnectInstance(instance.id)}
                      disabled={loadingInstances.has(instance.id)}
                      className="btn btn-primary flex-1"
                    >
                      {loadingInstances.has(instance.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Conectar
                    </button>
                  )}
                  {instance.status === 'QRCODE' && (
                    <button 
                      onClick={() => handleReconnectInstance(instance)}
                      disabled={loadingInstances.has(instance.id)}
                      className="btn btn-info flex-1"
                    >
                      {loadingInstances.has(instance.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Reconectar
                    </button>
                  )}
                  {instance.status === 'CONNECTED' && (
                    <button 
                      onClick={() => handleDisconnectInstance(instance.id)}
                      disabled={loadingInstances.has(instance.id)}
                      className="btn btn-secondary flex-1"
                    >
                      {loadingInstances.has(instance.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <WifiOff className="w-4 h-4 mr-2" />
                      )}
                      Desconectar
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (instance.status === 'CONNECTED') {
                        handleOpenSettingsModal(instance);
                      } else {
                        setSelectedInstance(instance);
                        setIsCreateModalOpen(true);
                      }
                    }}
                    className="btn btn-secondary"
                    title={instance.status === 'CONNECTED' ? 'Configurações da Instância' : 'Editar Instância'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteInstance(instance.id)}
                    disabled={deleteMutation.isPending}
                    className="btn btn-danger"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Estatísticas */}
      {!isLoading && !error && instances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Instâncias</p>
                <p className="text-2xl font-bold text-white">{instances.length}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <Wifi className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Conectadas</p>
                <p className="text-2xl font-bold text-white">
                  {instances.filter((i: Instance) => i.status === 'CONNECTED').length}
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <Wifi className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Conectando</p>
                <p className="text-2xl font-bold text-white">
                  {instances.filter((i: Instance) => i.status === 'CONNECTING').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500 rounded-lg">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Desconectadas</p>
                <p className="text-2xl font-bold text-white">
                  {instances.filter((i: Instance) => i.status === 'DISCONNECTED' || i.status === 'UNKNOWN').length}
                </p>
              </div>
              <div className="p-3 bg-red-500 rounded-lg">
                <WifiOff className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">QR Code</p>
                <p className="text-2xl font-bold text-white">
                  {instances.filter((i: Instance) => i.status === 'QRCODE').length}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InstanceModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedInstance(null);
        }}
        onSave={handleCreateInstance}
        isLoading={createMutation.isPending}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={handleCloseQRModal}
        instanceName={selectedInstance?.name || ''}
        qrCode={qrCodeData.qrCode}
        status={qrCodeData.status}
        onRefresh={handleRefreshQR}
        onReopen={() => {
          if (selectedInstance) {
            handleReconnectInstance(selectedInstance);
          }
        }}
        isLoading={connectMutation.isPending}
      />

      <InstanceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
        instance={selectedInstance}
      />
    </div>
  );
};

export default Instances;
