import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  User,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Zap,
  Settings
} from 'lucide-react';
import kanbanService, { Kanban, CreateCardData, UpdateCardData } from '../services/kanbanService';
import kanbanActionService, { ActionType, ActionTrigger, CreateActionData } from '../services/kanbanActionService';
import { cn } from '../utils/cn';

const KanbanView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Queries
  const { data: kanban, isLoading } = useQuery({
    queryKey: ['kanban', id],
    queryFn: () => kanbanService.getKanban(id!),
    enabled: !!id
  });

  // Mutations
  const createCardMutation = useMutation({
    mutationFn: (data: CreateCardData) => kanbanService.createCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', id] });
      toast.success('Card criado com sucesso!');
      setIsCreateCardModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar card');
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: UpdateCardData }) => 
      kanbanService.updateCard(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', id] });
      toast.success('Card atualizado com sucesso!');
      setIsEditCardModalOpen(false);
      setSelectedCard(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar card');
    }
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, newColumnId }: { cardId: string; newColumnId: string }) =>
      kanbanService.moveCard(cardId, newColumnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', id] });
      toast.success('Card movido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao mover card');
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => kanbanService.deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', id] });
      toast.success('Card excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir card');
    }
  });

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedCard && draggedCard !== columnId) {
      moveCardMutation.mutate({ cardId: draggedCard, newColumnId: columnId });
    }
    setDraggedCard(null);
    setDragOverColumn(null);
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

  if (!kanban) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Kanban não encontrado</h2>
          <button
            onClick={() => navigate('/kanbans')}
            className="btn btn-primary mt-4"
          >
            Voltar aos Kanbans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/kanbans')}
            className="btn btn-secondary"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: kanban.color }}
            ></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{kanban.name}</h1>
              {kanban.description && (
                <p className="text-gray-400">{kanban.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Criado por {kanban.createdBy.name}</span>
          <span>•</span>
          <span>{formatDate(kanban.createdAt)}</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4 kanban-scrollbar">
        {kanban.columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 w-80 kanban-column",
              dragOverColumn === column.id && "drag-over"
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                ></div>
                <h3 className="font-semibold text-white">{column.name}</h3>
                <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                  {column.cards?.length || 0}
                </span>
              </div>
                             <div className="flex gap-1">
                 <button
                   onClick={() => {
                     setSelectedColumn(column.id);
                     setIsCreateCardModalOpen(true);
                   }}
                   className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
                 >
                   <Plus size={16} />
                 </button>
                 <button
                   onClick={() => {
                     setSelectedColumn(column.id);
                     setIsActionsModalOpen(true);
                   }}
                   className="text-gray-400 hover:text-blue-400 p-1 rounded hover:bg-gray-800"
                   title="Gerenciar ações automáticas"
                 >
                   <Zap size={16} />
                 </button>
               </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {column.cards?.map((card: any) => (
                <div
                  key={card.id}
                  className={cn(
                    "kanban-card",
                    draggedCard === card.id && "dragging"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id)}
                >
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white line-clamp-2">{card.title}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedCard(card);
                            setIsEditCardModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-blue-400 p-1 rounded hover:bg-gray-700"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir este card?')) {
                              deleteCardMutation.mutate(card.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {card.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{card.description}</p>
                    )}

                    {/* Card Metadata */}
                    <div className="space-y-2">
                      {card.contact && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User size={12} />
                          <span>{card.contact.name}</span>
                          {card.contact.phoneNumber && (
                            <Phone size={12} />
                          )}
                          {card.contact.email && (
                            <Mail size={12} />
                          )}
                        </div>
                      )}
                      
                      {card.conversation && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MessageCircle size={12} />
                          <span>{card.conversation.title}</span>
                        </div>
                      )}
                      
                      {card.campaign && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{card.campaign.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Criado por {card.createdBy.name}</span>
                        <span>{formatDate(card.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Card Modal */}
      {isCreateCardModalOpen && (
        <CreateCardModal
          kanban={kanban}
          selectedColumn={selectedColumn}
          onClose={() => {
            setIsCreateCardModalOpen(false);
            setSelectedColumn('');
          }}
          onSubmit={(data) => createCardMutation.mutate(data)}
          isLoading={createCardMutation.isPending}
        />
      )}

             {/* Edit Card Modal */}
       {isEditCardModalOpen && selectedCard && (
         <EditCardModal
           card={selectedCard}
           onClose={() => {
             setIsEditCardModalOpen(false);
             setSelectedCard(null);
           }}
           onSubmit={(data) => updateCardMutation.mutate({ cardId: selectedCard.id, data })}
           isLoading={updateCardMutation.isPending}
         />
       )}

       {/* Actions Modal */}
       {isActionsModalOpen && selectedColumn && (
         <ActionsModal
           columnId={selectedColumn}
           columnName={kanban?.columns.find(c => c.id === selectedColumn)?.name || ''}
           onClose={() => {
             setIsActionsModalOpen(false);
             setSelectedColumn('');
           }}
         />
       )}
     </div>
   );
 };

// Create Card Modal Component
interface CreateCardModalProps {
  kanban: Kanban;
  selectedColumn: string;
  onClose: () => void;
  onSubmit: (data: CreateCardData) => void;
  isLoading: boolean;
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({ 
  kanban, 
  selectedColumn, 
  onClose, 
  onSubmit, 
  isLoading 
}) => {
  const [formData, setFormData] = useState<CreateCardData>({
    title: '',
    description: '',
    columnId: selectedColumn,
    kanbanId: kanban.id
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Novo Card</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Título</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
              <label className="block text-sm font-medium text-white">Coluna</label>
              <select
                value={formData.columnId}
                onChange={(e) => setFormData(prev => ({ ...prev, columnId: e.target.value }))}
                className="input mt-1"
              >
                {kanban.columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
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
              {isLoading ? 'Criando...' : 'Criar Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Card Modal Component
interface EditCardModalProps {
  card: any;
  onClose: () => void;
  onSubmit: (data: UpdateCardData) => void;
  isLoading: boolean;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ card, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<UpdateCardData>({
    title: card.title,
    description: card.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Editar Card</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">Título</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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

// Actions Modal Component
interface ActionsModalProps {
  columnId: string;
  columnName: string;
  onClose: () => void;
}

const ActionsModal: React.FC<ActionsModalProps> = ({ columnId, columnName, onClose }) => {
  const queryClient = useQueryClient();
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Queries
  const { data: actions, isLoading } = useQuery({
    queryKey: ['kanban-actions', columnId],
    queryFn: () => kanbanActionService.listActions(columnId),
    enabled: !!columnId
  });

  const { data: templates } = useQuery({
    queryKey: ['kanban-action-templates'],
    queryFn: () => kanbanActionService.getTemplates()
  });

  // Mutations
  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => kanbanActionService.deleteAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-actions', columnId] });
      toast.success('Ação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir ação');
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Ações Automáticas</h2>
            <p className="text-gray-400">Coluna: {columnName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreateActionModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              Nova Ação
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Fechar
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {actions && actions.length > 0 ? (
              actions.map((action) => (
                <div key={action.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{kanbanActionService.getActionTypeIcon(action.type)}</span>
                        <h3 className="font-medium text-white">{action.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          action.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {action.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      
                      {action.description && (
                        <p className="text-sm text-gray-400 mb-2">{action.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Tipo: {kanbanActionService.getActionTypeName(action.type)}</span>
                        <span>Trigger: {kanbanActionService.getTriggerName(action.trigger)}</span>
                        <span>Execuções: {action._count?.executions || 0}</span>
                        <span>Criado em: {formatDate(action.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir esta ação?')) {
                            deleteActionMutation.mutate(action.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700"
                        title="Excluir ação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhuma ação configurada</h3>
                <p className="text-gray-400 mb-4">
                  Configure ações automáticas para esta coluna. Elas serão executadas quando cards entrarem ou saírem da coluna.
                </p>
                <button
                  onClick={() => setIsCreateActionModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Criar Primeira Ação
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Action Modal */}
        {isCreateActionModalOpen && (
          <CreateActionModal
            columnId={columnId}
            columnName={columnName}
            templates={templates || []}
            onClose={() => setIsCreateActionModalOpen(false)}
            onSuccess={() => {
              setIsCreateActionModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['kanban-actions', columnId] });
            }}
          />
        )}
      </div>
    </div>
  );
};

// Create Action Modal Component
interface CreateActionModalProps {
  columnId: string;
  columnName: string;
  templates: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateActionModal: React.FC<CreateActionModalProps> = ({ 
  columnId, 
  columnName, 
  templates, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateActionData>({
    name: '',
    description: '',
    type: ActionType.SEND_MESSAGE,
    trigger: ActionTrigger.ON_ENTER_COLUMN,
    conditions: {},
    config: {},
    columnId
  });

  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const createActionMutation = useMutation({
    mutationFn: (data: CreateActionData) => kanbanActionService.createAction(data),
    onSuccess: () => {
      toast.success('Ação criada com sucesso!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar ação');
    }
  });

  const handleTemplateSelect = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description,
      type: template.type,
      trigger: template.trigger,
      conditions: template.conditions || {},
      config: { ...template.config },
      columnId
    });
    setSelectedTemplate(template);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar configuração
    const errors = kanbanActionService.validateActionConfig(formData.type, formData.config);
    if (errors.length > 0) {
      toast.error(`Erro na configuração: ${errors.join(', ')}`);
      return;
    }

    createActionMutation.mutate(formData);
  };

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Nova Ação Automática</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Usar template (opcional)
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      selectedTemplate === template
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{kanbanActionService.getActionTypeIcon(template.type)}</span>
                      <span className="font-medium text-white">{template.name}</span>
                    </div>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white">Nome da Ação</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input mt-1"
                placeholder="Ex: Notificar Cliente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as ActionType;
                  setFormData(prev => ({
                    ...prev,
                    type: newType,
                    config: kanbanActionService.getDefaultConfig(newType)
                  }));
                }}
                className="input mt-1"
              >
                {Object.values(ActionType).map(type => (
                  <option key={type} value={type}>
                    {kanbanActionService.getActionTypeName(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input mt-1"
              rows={2}
              placeholder="Descreva o que esta ação faz..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Quando Executar</label>
            <select
              value={formData.trigger}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value as ActionTrigger }))}
              className="input mt-1"
            >
              {Object.values(ActionTrigger).map(trigger => (
                <option key={trigger} value={trigger}>
                  {kanbanActionService.getTriggerName(trigger)}
                </option>
              ))}
            </select>
          </div>

          {/* Configuration based on type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Configuração</h3>
            
            {formData.type === ActionType.SEND_MESSAGE && (
              <div>
                <label className="block text-sm font-medium text-white">Mensagem</label>
                <textarea
                  value={formData.config.message || ''}
                  onChange={(e) => updateConfig('message', e.target.value)}
                  className="input mt-1"
                  rows={4}
                  placeholder="Digite a mensagem que será enviada..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variáveis disponíveis: {'{{contact.name}}'}, {'{{card.title}}'}, {'{{card.description}}'}
                </p>
              </div>
            )}

            {formData.type === ActionType.NOTIFY_USER && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white">Mensagem</label>
                  <textarea
                    value={formData.config.message || ''}
                    onChange={(e) => updateConfig('message', e.target.value)}
                    className="input mt-1"
                    rows={3}
                    placeholder="Mensagem para o usuário..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Usuário (ID)</label>
                  <input
                    type="text"
                    value={formData.config.userId || ''}
                    onChange={(e) => updateConfig('userId', e.target.value)}
                    className="input mt-1"
                    placeholder="ID do usuário a ser notificado"
                  />
                </div>
              </div>
            )}

            {formData.type === ActionType.UPDATE_STATUS && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white">Novo Status</label>
                  <input
                    type="text"
                    value={formData.config.newStatus || ''}
                    onChange={(e) => updateConfig('newStatus', e.target.value)}
                    className="input mt-1"
                    placeholder="Ex: IN_PROGRESS, CLOSED"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateCardStatus"
                    checked={formData.config.updateCardStatus || false}
                    onChange={(e) => updateConfig('updateCardStatus', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="updateCardStatus" className="text-sm text-white">
                    Atualizar status do card
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="updateConversationStatus"
                    checked={formData.config.updateConversationStatus || false}
                    onChange={(e) => updateConfig('updateConversationStatus', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="updateConversationStatus" className="text-sm text-white">
                    Atualizar status da conversa
                  </label>
                </div>
              </div>
            )}

            {formData.type === ActionType.SEND_EMAIL && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white">Email</label>
                  <input
                    type="email"
                    value={formData.config.email || ''}
                    onChange={(e) => updateConfig('email', e.target.value)}
                    className="input mt-1"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Assunto</label>
                  <input
                    type="text"
                    value={formData.config.subject || ''}
                    onChange={(e) => updateConfig('subject', e.target.value)}
                    className="input mt-1"
                    placeholder="Assunto do email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Mensagem</label>
                  <textarea
                    value={formData.config.message || ''}
                    onChange={(e) => updateConfig('message', e.target.value)}
                    className="input mt-1"
                    rows={4}
                    placeholder="Conteúdo do email..."
                  />
                </div>
              </div>
            )}

            {formData.type === ActionType.WEBHOOK_CALL && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white">URL do Webhook</label>
                  <input
                    type="url"
                    value={formData.config.webhookUrl || ''}
                    onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                    className="input mt-1"
                    placeholder="https://api.exemplo.com/webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Headers (JSON)</label>
                  <textarea
                    value={JSON.stringify(formData.config.headers || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const headers = JSON.parse(e.target.value);
                        updateConfig('headers', headers);
                      } catch (error) {
                        // Ignorar erro de JSON inválido
                      }
                    }}
                    className="input mt-1"
                    rows={3}
                    placeholder='{"Authorization": "Bearer token"}'
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createActionMutation.isPending}
              className="btn btn-primary"
            >
              {createActionMutation.isPending ? 'Criando...' : 'Criar Ação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KanbanView;
