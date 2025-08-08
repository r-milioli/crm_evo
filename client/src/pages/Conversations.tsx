import React from 'react';
import { Search, Filter, MoreVertical, MessageCircle, Clock, CheckCircle } from 'lucide-react';

const Conversations: React.FC = () => {
  const conversations = [
    {
      id: '1',
      contact: 'João Silva',
      phone: '+55 11 99999-9999',
      lastMessage: 'Olá, gostaria de saber sobre os produtos',
      status: 'open',
      unread: 2,
      lastActivity: '2 min atrás'
    },
    {
      id: '2',
      contact: 'Maria Santos',
      phone: '+55 11 88888-8888',
      lastMessage: 'Obrigada pelo atendimento!',
      status: 'closed',
      unread: 0,
      lastActivity: '1 hora atrás'
    },
    {
      id: '3',
      contact: 'Pedro Costa',
      phone: '+55 11 77777-7777',
      lastMessage: 'Qual o prazo de entrega?',
      status: 'in_progress',
      unread: 1,
      lastActivity: '30 min atrás'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="badge badge-warning">Aberta</span>;
      case 'in_progress':
        return <span className="badge badge-info">Em Andamento</span>;
      case 'closed':
        return <span className="badge badge-success">Finalizada</span>;
      default:
        return <span className="badge badge-secondary">Desconhecido</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversas</h1>
          <p className="text-gray-400">Gerencie suas conversas do WhatsApp</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar conversas..."
          className="input pl-10"
        />
      </div>

      {/* Lista de conversas */}
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="card cursor-pointer hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-whatsapp-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">{conversation.contact}</h3>
                    {conversation.unread > 0 && (
                      <span className="badge badge-primary">{conversation.unread}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{conversation.phone}</p>
                  <p className="text-sm text-gray-300 mt-1">{conversation.lastMessage}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-400">{conversation.lastActivity}</p>
                  {getStatusBadge(conversation.status)}
                </div>
                <button className="btn btn-ghost">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Conversas</p>
              <p className="text-2xl font-bold text-white">{conversations.length}</p>
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
              <p className="text-2xl font-bold text-white">
                {conversations.filter(c => c.status === 'open').length}
              </p>
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
              <p className="text-2xl font-bold text-white">
                {conversations.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Finalizadas</p>
              <p className="text-2xl font-bold text-white">
                {conversations.filter(c => c.status === 'closed').length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
