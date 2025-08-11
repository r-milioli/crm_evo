import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Phone,
  Calendar,
  TrendingUp,
  Bell,
  Archive,
  RefreshCw,
  Download,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Conversation, ConversationFilters, ConversationStatus, Priority } from '../types';
import conversationsService, { ConversationStats } from '../services/conversationsService';
import instancesService, { Instance } from '../services/instancesService';
import ConversationModal from '../components/ConversationModal';
import ConversationFiltersComponent from '../components/ConversationFilters';
import EvolutionInfoPanel from '../components/EvolutionInfoPanel';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

const Conversations: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showInstanceSelector, setShowInstanceSelector] = useState(false);
  const [showEvolutionPanel, setShowEvolutionPanel] = useState(false);
  
  const { user } = useAuthStore();

  useEffect(() => {
    loadConversations();
    loadStats();
    loadUsers();
    loadInstances();
  }, [filters, currentPage]);

  useEffect(() => {
    // Atualizar conversas a cada 30 segundos
    const interval = setInterval(() => {
      loadConversations();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await conversationsService.getConversations(filters, currentPage, 20);
      setConversations(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await conversationsService.getConversationStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // Implementar carregamento de usuários
      // const response = await usersService.getUsers();
      // setUsers(response);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadInstances = async () => {
    try {
      const response = await instancesService.getInstances();
      setInstances(response);
      // Selecionar a primeira instância por padrão se não houver nenhuma selecionada
      if (response.length > 0 && !selectedInstance) {
        setSelectedInstance(response[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  const handleSyncEvolution = async () => {
    if (!selectedInstance) {
      toast.error('Selecione uma instância para sincronização');
      return;
    }

    setIsSyncing(true);
    try {
      const response = await conversationsService.syncEvolutionChats(selectedInstance);
      
      if (response.success) {
        toast.success(`Sincronização concluída: ${response.data.created} criadas, ${response.data.updated} atualizadas`);
        loadConversations();
        loadStats();
      } else {
        toast.error(`Erro na sincronização: ${response.message}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com a Evolution API');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsModalOpen(true);
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );
    setSelectedConversation(updatedConversation);
  };

  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters(prev => ({ ...prev, search: term }));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: ConversationStatus) => {
    const config = {
      OPEN: { color: 'bg-yellow-500', text: 'Aberta', icon: Clock },
      IN_PROGRESS: { color: 'bg-blue-500', text: 'Em Andamento', icon: MessageCircle },
      CLOSED: { color: 'bg-green-500', text: 'Fechada', icon: CheckCircle },
      WAITING: { color: 'bg-orange-500', text: 'Aguardando', icon: AlertTriangle },
      ARCHIVED: { color: 'bg-gray-500', text: 'Arquivada', icon: Archive }
    };
    
    const config_ = config[status];
    const Icon = config_.icon;
    
    return (
      <span className={cn('badge text-white flex items-center gap-1', config_.color)}>
        <Icon className="w-3 h-3" />
        {config_.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: Priority) => {
    const config = {
      LOW: { color: 'bg-gray-500', text: 'Baixa' },
      MEDIUM: { color: 'bg-blue-500', text: 'Média' },
      HIGH: { color: 'bg-orange-500', text: 'Alta' },
      URGENT: { color: 'bg-red-500', text: 'Urgente' }
    };
    
    const config_ = config[priority];
    return (
      <span className={cn('badge text-white', config_.color)}>
        {config_.text}
      </span>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} min atrás`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const getUnreadCount = (conversation: Conversation) => {
    // Implementar lógica para contar mensagens não lidas
    return conversation._count?.messages || 0;
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const contactName = conversation.contact.name?.toLowerCase() || '';
      const contactPhone = conversation.contact.phoneNumber.toLowerCase();
      const title = conversation.title?.toLowerCase() || '';
      
      return contactName.includes(searchLower) || 
             contactPhone.includes(searchLower) || 
             title.includes(searchLower);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversas</h1>
          <p className="text-gray-400">Gerencie suas conversas do WhatsApp</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Seletor de Instância e Botão de Sincronização */}
          <div className="relative">
            <div className="flex items-center space-x-2">
              <select
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="select select-sm bg-gray-700 border-gray-600 text-white"
                disabled={isSyncing || instances.length === 0}
              >
                <option value="">Selecione uma instância</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} ({instance.instanceName})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSyncEvolution}
                disabled={isSyncing || !selectedInstance}
                className="btn btn-primary btn-sm"
                title="Sincronizar com Evolution API"
              >
                <Download className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>
                   <button
           onClick={loadConversations}
           disabled={isLoading}
           className="btn btn-ghost btn-sm"
           title="Atualizar"
         >
           <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
         </button>
         <button
           onClick={() => setShowEvolutionPanel(!showEvolutionPanel)}
           className="btn btn-secondary btn-sm"
           title="Evolution API Info"
         >
           <MessageCircle className="w-4 h-4 mr-1" />
           {showEvolutionPanel ? 'Ocultar' : 'Mostrar'} Info
         </button>
         <ConversationFiltersComponent
           filters={filters}
           onFiltersChange={handleFiltersChange}
           users={users}
           instances={instances}
        />
      </div>
      </div>

      {/* Estatísticas */}
      {stats && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Conversas</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Abertas</p>
                <p className="text-2xl font-bold text-white">{stats.open}</p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Em Andamento</p>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-400">Urgentes</p>
                <p className="text-2xl font-bold text-white">{stats.urgent}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar conversas por nome, telefone ou mensagem..."
          className="input pl-10"
        />
      </div>

      {/* Lista de conversas */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              Nenhuma conversa encontrada
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Não há conversas disponíveis no momento.'}
              </p>
            </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleConversationClick(conversation)}
              className="card cursor-pointer hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    {getUnreadCount(conversation) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {getUnreadCount(conversation)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-white">
                        {conversation.contact.name || conversation.contact.phoneNumber}
                      </h3>
                      {conversation.priority === 'URGENT' && (
                        <Bell className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Phone className="w-3 h-3" />
                      <span>{conversation.contact.phoneNumber}</span>
                      {conversation.assignedTo && (
                        <>
                          <span>•</span>
                          <User className="w-3 h-3" />
                          <span>{conversation.assignedTo.name}</span>
                        </>
                      )}
                    </div>
                    
                    {conversation.title && (
                      <p className="text-sm text-gray-300 mt-1">{conversation.title}</p>
                    )}
                    
                    {conversation.tags && conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {conversation.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
                            +{conversation.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : 'Nunca'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(conversation.status)}
                      {getPriorityBadge(conversation.priority)}
            </div>
          </div>
        </div>
      </div>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn btn-ghost btn-sm"
          >
            Anterior
          </button>
          
          <span className="text-sm text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-ghost btn-sm"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Evolution API Info Panel */}
      {showEvolutionPanel && (
        <div className="mt-6">
          <EvolutionInfoPanel
            selectedInstance={selectedInstance}
            instances={instances}
          />
        </div>
      )}

      {/* Modal de conversa */}
      <ConversationModal
        conversation={selectedConversation}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedConversation(null);
        }}
        onUpdate={handleConversationUpdate}
      />
    </div>
  );
};

export default Conversations;
