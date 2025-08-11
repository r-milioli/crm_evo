import React, { useState } from 'react';
import { 
  Filter, 
  X, 
  Search, 
  Calendar,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { ConversationFilters, ConversationStatus, Priority, User as UserType } from '../types';

interface ConversationFiltersProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  users: UserType[];
  instances: any[];
}

const ConversationFiltersComponent: React.FC<ConversationFiltersProps> = ({
  filters,
  onFiltersChange,
  users,
  instances
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ConversationFilters>(filters);

  const handleFilterChange = (key: keyof ConversationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: ConversationFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  };

  const getStatusIcon = (status: ConversationStatus) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <MessageCircle className="w-4 h-4" />;
      case 'CLOSED':
        return <CheckCircle className="w-4 h-4" />;
      case 'WAITING':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-500';
      case 'MEDIUM':
        return 'bg-blue-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'URGENT':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key as keyof ConversationFilters]).length;

  return (
    <div className="relative">
      {/* Botão de filtros */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'btn btn-secondary flex items-center space-x-2',
          activeFiltersCount > 0 && 'btn-primary'
        )}
      >
        <Filter className="w-4 h-4" />
        <span>Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="badge badge-sm">{activeFiltersCount}</span>
        )}
      </button>

      {/* Modal de filtros */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Filtros</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Busca */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={localFilters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Nome, telefone, mensagem..."
                    className="input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={localFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="select select-bordered w-full"
                >
                  <option value="">Todos os status</option>
                  <option value="OPEN">Aberta</option>
                  <option value="IN_PROGRESS">Em Andamento</option>
                  <option value="CLOSED">Fechada</option>
                  <option value="WAITING">Aguardando</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prioridade
                </label>
                <select
                  value={localFilters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                  className="select select-bordered w-full"
                >
                  <option value="">Todas as prioridades</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              {/* Operador */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Operador
                </label>
                <select
                  value={localFilters.assignedTo || ''}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value || undefined)}
                  className="select select-bordered w-full"
                >
                  <option value="">Todos os operadores</option>
                  <option value="unassigned">Não atribuído</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instância */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instância
                </label>
                <select
                  value={localFilters.instanceId || ''}
                  onChange={(e) => handleFilterChange('instanceId', e.target.value || undefined)}
                  className="select select-bordered w-full"
                >
                  <option value="">Todas as instâncias</option>
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Período
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFilterChange('period', 'today')}
                    className={cn(
                      'btn btn-sm',
                      localFilters.period === 'today' ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => handleFilterChange('period', 'week')}
                    className={cn(
                      'btn btn-sm',
                      localFilters.period === 'week' ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    Esta semana
                  </button>
                  <button
                    onClick={() => handleFilterChange('period', 'month')}
                    className={cn(
                      'btn btn-sm',
                      localFilters.period === 'month' ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    Este mês
                  </button>
                  <button
                    onClick={() => handleFilterChange('period', 'custom')}
                    className={cn(
                      'btn btn-sm',
                      localFilters.period === 'custom' ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {/* Filtros rápidos */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filtros Rápidos
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const newFilters = { ...localFilters, status: 'OPEN' as ConversationStatus };
                      setLocalFilters(newFilters);
                    }}
                    className="w-full btn btn-sm btn-warning justify-start"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Conversas Abertas
                  </button>
                  
                  <button
                    onClick={() => {
                      const newFilters = { ...localFilters, priority: 'URGENT' as Priority };
                      setLocalFilters(newFilters);
                    }}
                    className="w-full btn btn-sm btn-error justify-start"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Urgentes
                  </button>
                  
                  <button
                    onClick={() => {
                      const newFilters = { ...localFilters, assignedTo: 'unassigned' };
                      setLocalFilters(newFilters);
                    }}
                    className="w-full btn btn-sm btn-info justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Não Atribuídas
                  </button>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleApplyFilters}
                className="btn btn-primary flex-1"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={handleClearFilters}
                className="btn btn-ghost"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Função auxiliar para classes condicionais
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default ConversationFiltersComponent;
