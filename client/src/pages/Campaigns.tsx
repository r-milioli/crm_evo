import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Play, Edit, Trash2, Calendar, Users, MessageSquare, BarChart3 } from 'lucide-react';
import campaignsService, { Campaign, CreateCampaignData } from '../services/campaignsService';
import { cn } from '../utils/cn';

const Campaigns: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [draggedCampaign, setDraggedCampaign] = useState<Campaign | null>(null);
  
  const queryClient = useQueryClient();

  // Queries
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignsService.listCampaigns(filters)
  });

  const { data: stats } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: () => campaignsService.getCampaignStats()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateCampaignData) => campaignsService.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campanha criada com sucesso!');
      setIsCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar campanha');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => campaignsService.updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campanha atualizada com sucesso!');
      setIsEditModalOpen(false);
      setSelectedCampaign(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar campanha');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campanha excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir campanha');
    }
  });

  const executeMutation = useMutation({
    mutationFn: ({ id, instanceName }: { id: string; instanceName: string }) => 
      campaignsService.executeCampaign(id, instanceName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success(`Campanha executada! ${data.sentCount} mensagens enviadas.`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao executar campanha');
    }
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      campaignsService.updateCampaign(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Status da campanha atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-700 text-gray-300';
      case 'SCHEDULED': return 'bg-blue-600 text-white';
      case 'RUNNING': return 'bg-yellow-600 text-white';
      case 'COMPLETED': return 'bg-green-600 text-white';
      case 'CANCELLED': return 'bg-red-600 text-white';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Rascunho';
      case 'SCHEDULED': return 'Agendada';
      case 'RUNNING': return 'Executando';
      case 'COMPLETED': return 'Concluída';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  };



  const statusColumns = [
    { key: 'DRAFT', title: 'Rascunho', color: 'border-gray-500', bgColor: 'bg-gray-900/20' },
    { key: 'SCHEDULED', title: 'Agendada', color: 'border-blue-500', bgColor: 'bg-blue-900/20' },
    { key: 'RUNNING', title: 'Executando', color: 'border-yellow-500', bgColor: 'bg-yellow-900/20' },
    { key: 'COMPLETED', title: 'Concluída', color: 'border-green-500', bgColor: 'bg-green-900/20' },
    { key: 'CANCELLED', title: 'Cancelada', color: 'border-red-500', bgColor: 'bg-red-900/20' }
  ];

  const handleDragStart = (e: React.DragEvent, campaign: Campaign) => {
    setDraggedCampaign(campaign);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedCampaign && draggedCampaign.status !== targetStatus) {
      statusUpdateMutation.mutate({ id: draggedCampaign.id, status: targetStatus });
    }
    setDraggedCampaign(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-gray-400">Gerencie suas campanhas de marketing</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className="btn btn-secondary"
          >
            {viewMode === 'kanban' ? 'Vista Tabela' : 'Vista Kanban'}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={20} />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Total de Campanhas</p>
                <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <MessageSquare className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Mensagens Enviadas</p>
                <p className="text-2xl font-bold text-white">{stats.totalSent}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <Users className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Entregues</p>
                <p className="text-2xl font-bold text-white">{stats.totalDelivered}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-500">
                <Calendar className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Taxa de Entrega</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="input flex-1"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="input"
          >
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SCHEDULED">Agendada</option>
            <option value="RUNNING">Executando</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="flex gap-6 overflow-x-auto pb-4 kanban-scrollbar">
          {statusColumns.map((column) => {
            const columnCampaigns = campaigns.filter(campaign => campaign.status === column.key);
            return (
              <div
                key={column.key}
                className={cn(
                  "flex-shrink-0 w-80 kanban-column",
                  column.bgColor,
                  "rounded-lg border-2 border-dashed",
                  column.color,
                  "p-4",
                  draggedCampaign && draggedCampaign.status !== column.key && "drag-over"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-3 h-3 rounded-full", column.color.replace('border-', 'bg-'))}></span>
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                      {columnCampaigns.length}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {columnCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, campaign)}
                      className={cn(
                        "card kanban-card cursor-move",
                        draggedCampaign?.id === campaign.id && "dragging"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white mb-1 line-clamp-1">{campaign.name}</h4>
                          {campaign.description && (
                            <p className="text-sm text-gray-400 mb-2 line-clamp-2">{campaign.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📞 {campaign.targetContacts.length} contatos</span>
                            <span>📤 {campaign.sentCount}/{campaign.deliveredCount}</span>
                          </div>
                          {campaign.scheduledAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              📅 {formatDate(campaign.scheduledAt)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaign(campaign);
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20"
                          >
                            <Edit size={14} />
                          </button>
                          {campaign.status === 'DRAFT' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const instanceName = window.prompt('Digite o nome da instância:');
                                if (instanceName) {
                                  executeMutation.mutate({ id: campaign.id, instanceName });
                                }
                              }}
                              className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-green-500/20"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          {campaign.status !== 'RUNNING' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
                                  deleteMutation.mutate(campaign.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Contatos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Enviadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Criada por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-gray-400">{campaign.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                        getStatusColor(campaign.status)
                      )}>
                        {getStatusText(campaign.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {campaign.targetContacts.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {campaign.sentCount} / {campaign.deliveredCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {campaign.createdBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsEditModalOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit size={16} />
                        </button>
                        {campaign.status === 'DRAFT' && (
                          <button
                            onClick={() => {
                              const instanceName = window.prompt('Digite o nome da instância:');
                              if (instanceName) {
                                executeMutation.mutate({ id: campaign.id, instanceName });
                              }
                            }}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Play size={16} />
                          </button>
                        )}
                        {campaign.status !== 'RUNNING' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
                                deleteMutation.mutate(campaign.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <CreateCampaignModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Campaign Modal */}
      {isEditModalOpen && selectedCampaign && (
        <EditCampaignModal
          campaign={selectedCampaign}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCampaign(null);
          }}
          onSubmit={(data) => updateMutation.mutate({ id: selectedCampaign.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
};

// Create Campaign Modal Component
interface CreateCampaignModalProps {
  onClose: () => void;
  onSubmit: (data: CreateCampaignData) => void;
  isLoading: boolean;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    messageTemplate: '',
    targetContacts: [],
    scheduledAt: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Nova Campanha</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Nome da Campanha</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Template da Mensagem</label>
              <textarea
                required
                value={formData.messageTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                className="input mt-1"
                rows={4}
                placeholder="Olá {{nome}}, {{mensagem}}..."
              />
              <p className="mt-1 text-sm text-gray-400">
                Use {'{{nome}}'}, {'{{telefone}}'}, {'{{email}}'}, {'{{empresa}}'} para personalizar
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Contatos Alvo (telefones)</label>
              <textarea
                value={formData.targetContacts.join('\n')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  targetContacts: e.target.value.split('\n').filter(phone => phone.trim()) 
                }))}
                className="input mt-1"
                rows={4}
                placeholder="5511999999999&#10;5511888888888"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Data de Agendamento (opcional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                className="input mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Criando...' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Campaign Modal Component
interface EditCampaignModalProps {
  campaign: Campaign;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ campaign, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: campaign.name,
    description: campaign.description || '',
    messageTemplate: campaign.messageTemplate,
    targetContacts: campaign.targetContacts,
    scheduledAt: campaign.scheduledAt || '',
    status: campaign.status as 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Editar Campanha</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Nome da Campanha</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Template da Mensagem</label>
              <textarea
                required
                value={formData.messageTemplate}
                onChange={(e) => setFormData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                className="input mt-1"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' }))}
                className="input mt-1"
              >
                <option value="DRAFT">Rascunho</option>
                <option value="SCHEDULED">Agendada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Campaigns;
