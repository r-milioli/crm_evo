import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Trello, Users, Activity, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import kanbanService, { Kanban, CreateKanbanData } from '../services/kanbanService';
import { cn } from '../utils/cn';

const Kanbans: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKanban, setSelectedKanban] = useState<Kanban | null>(null);
  const [filters, setFilters] = useState({ search: '' });
  
  const queryClient = useQueryClient();

  // Queries
  const { data: kanbans = [], isLoading } = useQuery({
    queryKey: ['kanbans', filters],
    queryFn: () => kanbanService.listKanbans(filters)
  });

  const { data: stats } = useQuery({
    queryKey: ['kanban-stats'],
    queryFn: () => kanbanService.getKanbanStats()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateKanbanData) => kanbanService.createKanban(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbans'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-stats'] });
      toast.success('Kanban criado com sucesso!');
      setIsCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar kanban');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => kanbanService.updateKanban(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbans'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-stats'] });
      toast.success('Kanban atualizado com sucesso!');
      setIsEditModalOpen(false);
      setSelectedKanban(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar kanban');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kanbanService.deleteKanban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbans'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-stats'] });
      toast.success('Kanban excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir kanban');
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getKanbanTemplates = () => [
    {
      name: 'Pipeline de Vendas',
      description: 'Gerencie leads e oportunidades de venda',
      color: '#3B82F6',
      columns: [
        { name: 'Lead', color: '#6B7280' },
        { name: 'Contato', color: '#3B82F6' },
        { name: 'Proposta', color: '#F59E0B' },
        { name: 'Fechado', color: '#10B981' }
      ]
    },
    {
      name: 'Suporte Técnico',
      description: 'Acompanhe tickets de suporte',
      color: '#EF4444',
      columns: [
        { name: 'Novo', color: '#6B7280' },
        { name: 'Em Atendimento', color: '#F59E0B' },
        { name: 'Aguardando Cliente', color: '#3B82F6' },
        { name: 'Resolvido', color: '#10B981' }
      ]
    },
    {
      name: 'Projetos',
      description: 'Gerencie projetos e tarefas',
      color: '#8B5CF6',
      columns: [
        { name: 'Backlog', color: '#6B7280' },
        { name: 'Em Andamento', color: '#F59E0B' },
        { name: 'Revisão', color: '#3B82F6' },
        { name: 'Concluído', color: '#10B981' }
      ]
    },
    {
      name: 'Atendimento',
      description: 'Pipeline de atendimento ao cliente',
      color: '#10B981',
      columns: [
        { name: 'Aguardando', color: '#6B7280' },
        { name: 'Em Atendimento', color: '#F59E0B' },
        { name: 'Finalizado', color: '#10B981' }
      ]
    }
  ];

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
          <h1 className="text-2xl font-bold text-white">Kanbans</h1>
          <p className="text-gray-400">Gerencie seus quadros de trabalho</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Novo Kanban
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <Trello className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Total de Kanbans</p>
                <p className="text-2xl font-bold text-white">{stats.totalKanbans}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <Users className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Total de Cards</p>
                <p className="text-2xl font-bold text-white">{stats.totalCards}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <Activity className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Atividades Recentes</p>
                <p className="text-2xl font-bold text-white">{stats.recentActivity.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-500">
                <Calendar className="text-white" size={24} />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-400">Média por Kanban</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalKanbans > 0 ? Math.round(stats.totalCards / stats.totalKanbans) : 0}
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
            placeholder="Buscar kanbans..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="input flex-1"
          />
        </div>
      </div>

      {/* Kanbans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kanbans.map((kanban) => (
          <div key={kanban.id} className="card hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: kanban.color }}
                ></div>
                <div>
                  <h3 className="font-semibold text-white">{kanban.name}</h3>
                  {kanban.description && (
                    <p className="text-sm text-gray-400">{kanban.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Link
                  to={`/kanbans/${kanban.id}`}
                  className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20"
                >
                  <Eye size={16} />
                </Link>
                <button
                  onClick={() => {
                    setSelectedKanban(kanban);
                    setIsEditModalOpen(true);
                  }}
                  className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-green-500/20"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir este kanban?')) {
                      deleteMutation.mutate(kanban.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Colunas:</span>
                <span className="text-white">{kanban.columns.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Cards:</span>
                <span className="text-white">{kanban._count?.cards || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Criado por:</span>
                <span className="text-white">{kanban.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Criado em:</span>
                <span className="text-white">{formatDate(kanban.createdAt)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <Link
                to={`/kanbans/${kanban.id}`}
                className="btn btn-primary w-full"
              >
                Abrir Kanban
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Kanban Modal */}
      {isCreateModalOpen && (
        <CreateKanbanModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          templates={getKanbanTemplates()}
        />
      )}

      {/* Edit Kanban Modal */}
      {isEditModalOpen && selectedKanban && (
        <EditKanbanModal
          kanban={selectedKanban}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedKanban(null);
          }}
          onSubmit={(data) => updateMutation.mutate({ id: selectedKanban.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
};

// Create Kanban Modal Component
interface CreateKanbanModalProps {
  onClose: () => void;
  onSubmit: (data: CreateKanbanData) => void;
  isLoading: boolean;
  templates: Array<{
    name: string;
    description: string;
    color: string;
    columns: Array<{ name: string; color: string }>;
  }>;
}

const CreateKanbanModal: React.FC<CreateKanbanModalProps> = ({ onClose, onSubmit, isLoading, templates }) => {
  const [formData, setFormData] = useState<CreateKanbanData>({
    name: '',
    description: '',
    color: '#3B82F6',
    columns: [{ name: 'A Fazer', color: '#6B7280' }]
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleTemplateSelect = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description,
      color: template.color,
      columns: template.columns
    });
    setSelectedTemplate(template.name);
  };

  const addColumn = () => {
    setFormData(prev => ({
      ...prev,
      columns: [...prev.columns, { name: `Coluna ${prev.columns.length + 1}`, color: '#6B7280' }]
    }));
  };

  const removeColumn = (index: number) => {
    if (formData.columns.length > 1) {
      setFormData(prev => ({
        ...prev,
        columns: prev.columns.filter((_, i) => i !== index)
      }));
    }
  };

  const updateColumn = (index: number, field: 'name' | 'color', value: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Novo Kanban</h2>
        
        {/* Templates */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <button
                key={template.name}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  selectedTemplate === template.name
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-600"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  ></div>
                  <span className="font-medium text-white">{template.name}</span>
                </div>
                <p className="text-sm text-gray-400">{template.description}</p>
                <p className="text-xs text-gray-500 mt-1">{template.columns.length} colunas</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Nome do Kanban</label>
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
              <label className="block text-sm font-medium text-white">Cor</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="mt-1 h-10 w-20 rounded border border-gray-700 bg-gray-800"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Colunas</label>
                <button
                  type="button"
                  onClick={addColumn}
                  className="btn btn-secondary text-sm"
                >
                  + Adicionar Coluna
                </button>
              </div>
              <div className="space-y-2">
                {formData.columns.map((column, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      className="input flex-1"
                      placeholder="Nome da coluna"
                    />
                    <input
                      type="color"
                      value={column.color}
                      onChange={(e) => updateColumn(index, 'color', e.target.value)}
                      className="h-10 w-16 rounded border border-gray-700 bg-gray-800"
                    />
                    {formData.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="btn btn-danger px-3"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
              {isLoading ? 'Criando...' : 'Criar Kanban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Kanban Modal Component
interface EditKanbanModalProps {
  kanban: Kanban;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const EditKanbanModal: React.FC<EditKanbanModalProps> = ({ kanban, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: kanban.name,
    description: kanban.description || '',
    color: kanban.color,
    columns: kanban.columns.map(col => ({ name: col.name, color: col.color }))
  });

  const addColumn = () => {
    setFormData(prev => ({
      ...prev,
      columns: [...prev.columns, { name: `Coluna ${prev.columns.length + 1}`, color: '#6B7280' }]
    }));
  };

  const removeColumn = (index: number) => {
    if (formData.columns.length > 1) {
      setFormData(prev => ({
        ...prev,
        columns: prev.columns.filter((_, i) => i !== index)
      }));
    }
  };

  const updateColumn = (index: number, field: 'name' | 'color', value: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Editar Kanban</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Nome do Kanban</label>
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
              <label className="block text-sm font-medium text-white">Cor</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="mt-1 h-10 w-20 rounded border border-gray-700 bg-gray-800"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Colunas</label>
                <button
                  type="button"
                  onClick={addColumn}
                  className="btn btn-secondary text-sm"
                >
                  + Adicionar Coluna
                </button>
              </div>
              <div className="space-y-2">
                {formData.columns.map((column, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      className="input flex-1"
                      placeholder="Nome da coluna"
                    />
                    <input
                      type="color"
                      value={column.color}
                      onChange={(e) => updateColumn(index, 'color', e.target.value)}
                      className="h-10 w-16 rounded border border-gray-700 bg-gray-800"
                    />
                    {formData.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="btn btn-danger px-3"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
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

export default Kanbans;
