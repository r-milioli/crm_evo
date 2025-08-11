import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  User
} from 'lucide-react';
import { Instance } from '../services/instancesService';
import conversationsService from '../services/conversationsService';
import { cn } from '../utils/cn';

interface EvolutionInfoPanelProps {
  selectedInstance: string;
  instances: Instance[];
}

interface EvolutionContact {
  id: string;
  remoteJid: string;
  pushName: string;
  profilePicUrl?: string;
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
  status: string;
}

const EvolutionInfoPanel: React.FC<EvolutionInfoPanelProps> = ({
  selectedInstance,
  instances
}) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'messages' | 'status'>('contacts');
  const [contacts, setContacts] = useState<EvolutionContact[]>([]);
  const [messages, setMessages] = useState<EvolutionMessage[]>([]);
  const [messageStatus, setMessageStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [remoteJid, setRemoteJid] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const loadContacts = async () => {
    if (!selectedInstance) return;
    
    setIsLoading(true);
    try {
      const response = await conversationsService.getEvolutionContacts(selectedInstance);
      
      if (response.success) {
        setContacts(response.data || []);
        console.log('Contatos carregados com sucesso:', response.data?.length || 0, 'contatos');
      } else {
        console.error('Erro ao carregar contatos:', response.message);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedInstance || !selectedContact) return;
    
    setIsLoading(true);
    try {
      const response = await conversationsService.getEvolutionMessages(selectedInstance, selectedContact);
      if (response.success) {
        setMessages(response.data?.messages?.records || []);
      } else {
        console.error('Erro ao carregar mensagens:', response.message);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessageStatus = async () => {
    if (!selectedInstance || !remoteJid || !selectedMessage) return;
    
    setIsLoading(true);
    try {
      const response = await conversationsService.getEvolutionMessageStatus(
        selectedInstance,
        remoteJid,
        selectedMessage
      );
      if (response.success) {
        setMessageStatus(response.data);
      } else {
        console.error('Erro ao carregar status da mensagem:', response.message);
      }
    } catch (error) {
      console.error('Erro ao carregar status da mensagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contacts') {
      loadContacts();
    }
  }, [activeTab, selectedInstance]);

  useEffect(() => {
    if (activeTab === 'messages' && selectedContact) {
      loadMessages();
    }
  }, [activeTab, selectedContact, selectedInstance]);

  useEffect(() => {
    if (activeTab === 'status' && remoteJid && selectedMessage) {
      loadMessageStatus();
    }
  }, [activeTab, remoteJid, selectedMessage, selectedInstance]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'READ':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Evolution API Info</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              activeTab === 'contacts'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Contatos
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={cn(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              activeTab === 'messages'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <MessageCircle className="w-4 h-4 inline mr-1" />
            Mensagens
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={cn(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              activeTab === 'status'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" />
            Status
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'contacts' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-white">Contatos ({contacts.length})</h4>
              <button
                onClick={loadContacts}
                disabled={isLoading}
                className="btn btn-sm btn-primary"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                Atualizar
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => toggleSection(contact.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {contact.profilePicUrl ? (
                        <img
                          src={contact.profilePicUrl}
                          alt={contact.pushName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{contact.pushName || 'Sem nome'}</p>
                        <p className="text-gray-400 text-sm">{contact.remoteJid}</p>
                      </div>
                    </div>
                    {expandedSections.has(contact.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  
                  {expandedSections.has(contact.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">ID:</span>
                          <p className="text-white">{contact.id}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Criado:</span>
                          <p className="text-white">{formatDate(contact.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Atualizado:</span>
                          <p className="text-white">{formatDate(contact.updatedAt)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Instance ID:</span>
                          <p className="text-white">{contact.instanceId}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecione um contato para ver as mensagens:
              </label>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="select select-sm bg-gray-700 border-gray-600 text-white w-full"
              >
                <option value="">Selecione um contato</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.remoteJid}>
                    {contact.pushName || contact.remoteJid}
                  </option>
                ))}
              </select>
            </div>

            {selectedContact && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-white">Mensagens</h4>
                  <button
                    onClick={loadMessages}
                    disabled={isLoading}
                    className="btn btn-sm btn-primary"
                  >
                    <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                    Atualizar
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.key.id}-${index}`}
                      className="bg-gray-700 rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(message.status)}
                          <span className="text-sm text-gray-400">
                            {message.key.fromMe ? 'Enviada' : 'Recebida'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(new Date(message.messageTimestamp * 1000).toISOString())}
                        </span>
                      </div>
                      <p className="text-white text-sm">
                        {message.message?.conversation || 
                         message.message?.extendedTextMessage?.text ||
                         'Mensagem não suportada'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {message.key.id}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Remote JID:
                </label>
                <input
                  type="text"
                  value={remoteJid}
                  onChange={(e) => setRemoteJid(e.target.value)}
                  placeholder="Ex: 5522998089722@s.whatsapp.net"
                  className="input input-sm bg-gray-700 border-gray-600 text-white w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message ID:
                </label>
                <input
                  type="text"
                  value={selectedMessage}
                  onChange={(e) => setSelectedMessage(e.target.value)}
                  placeholder="Ex: BAE5959535174C7E"
                  className="input input-sm bg-gray-700 border-gray-600 text-white w-full"
                />
              </div>

              <button
                onClick={loadMessageStatus}
                disabled={!remoteJid || !selectedMessage || isLoading}
                className="btn btn-sm btn-primary w-full"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                Buscar Status
              </button>
            </div>

            {messageStatus && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-white mb-3">Status da Mensagem</h4>
                <div className="bg-gray-700 rounded p-3">
                  <pre className="text-sm text-white overflow-x-auto">
                    {JSON.stringify(messageStatus, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvolutionInfoPanel;
