import React from 'react';
import { Search, Plus, Filter, MoreVertical, User, Phone, Mail, Tag } from 'lucide-react';

const Contacts: React.FC = () => {
  const contacts = [
    {
      id: '1',
      name: 'João Silva',
      phone: '+55 11 99999-9999',
      email: 'joao@email.com',
      company: 'Empresa ABC',
      tags: ['Cliente', 'Vip'],
      lastInteraction: '2 min atrás'
    },
    {
      id: '2',
      name: 'Maria Santos',
      phone: '+55 11 88888-8888',
      email: 'maria@email.com',
      company: 'Empresa XYZ',
      tags: ['Prospecto'],
      lastInteraction: '1 hora atrás'
    },
    {
      id: '3',
      name: 'Pedro Costa',
      phone: '+55 11 77777-7777',
      email: 'pedro@email.com',
      company: 'Empresa 123',
      tags: ['Cliente'],
      lastInteraction: '2 horas atrás'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-gray-400">Gerencie sua base de contatos</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contato
        </button>
      </div>

      {/* Busca e filtros */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar contatos..."
            className="input pl-10"
          />
        </div>
        <button className="btn btn-secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </button>
      </div>

      {/* Lista de contatos */}
      <div className="space-y-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="card cursor-pointer hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-whatsapp-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">{contact.name}</h3>
                    <div className="flex space-x-1">
                      {contact.tags.map((tag, index) => (
                        <span key={index} className="badge badge-outline text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">{contact.phone}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">{contact.email}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{contact.company}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Última interação</p>
                  <p className="text-sm text-gray-300">{contact.lastInteraction}</p>
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
              <p className="text-sm text-gray-400">Total de Contatos</p>
              <p className="text-2xl font-bold text-white">{contacts.length}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Clientes</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => c.tags.includes('Cliente')).length}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Prospectos</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => c.tags.includes('Prospecto')).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">VIP</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => c.tags.includes('Vip')).length}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <Tag className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;
