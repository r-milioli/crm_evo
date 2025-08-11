import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  User, 
  Clock, 
  Edit3, 
  Archive,
  ArchiveRestore,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  Phone,
  Mail,
  Building
} from 'lucide-react';
import { Conversation, Message, User as UserType, Priority, ConversationStatus } from '../types';
import conversationsService from '../services/conversationsService';
import { cn } from '../utils/cn';

interface ConversationModalProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (conversation: Conversation) => void;
}

const ConversationModal: React.FC<ConversationModalProps> = ({
  conversation,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [users] = useState<UserType[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!conversation) return;
    
    setIsLoading(true);
    try {
      const response = await conversationsService.getMessages(conversation.id);
      setMessages(response.data);
      
      // Se não há mensagens e a conversa tem externalId (da Evolution API), sincronizar
      if (response.data.length === 0 && conversation.externalId) {
        console.log('Nenhuma mensagem encontrada, sincronizando da Evolution API...');
        try {
          const syncResponse = await conversationsService.syncEvolutionMessages(
            conversation.id, 
            conversation.contact.phoneNumber + '@s.whatsapp.net'
          );
          
          if (syncResponse.success) {
            console.log('Mensagens sincronizadas:', syncResponse.message);
            // Recarregar mensagens após sincronização
            const updatedResponse = await conversationsService.getMessages(conversation.id);
            setMessages(updatedResponse.data);
          } else {
            console.error('Erro ao sincronizar mensagens:', syncResponse.message);
          }
        } catch (syncError: any) {
          console.error('Erro ao sincronizar mensagens:', syncError);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  useEffect(() => {
    if (conversation && isOpen) {
      loadMessages();
      loadUsers();
      setNote(conversation.notes || '');
    }
  }, [conversation, isOpen, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    try {
      // Aqui você precisaria implementar o serviço de usuários
      // const response = await usersService.getUsers();
      // setUsers(response);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    setIsSending(true);
    try {
      const messageData = {
        phoneNumber: conversation.contact.phoneNumber,
        content: newMessage,
        type: 'TEXT' as const,
        instanceId: conversation.instance.id,
        conversationId: conversation.id
      };

      const sentMessage = await conversationsService.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Atualizar última mensagem da conversa
      const updatedConversation = {
        ...conversation,
        lastMessageAt: new Date().toISOString()
      };
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
      // Aqui você pode adicionar um toast de erro se quiser
    } finally {
      setIsSending(false);
    }
  };

  const handleAssign = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.assignConversation(conversation.id);
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao assumir conversa:', error);
    }
  };

  const handleTransfer = async () => {
    if (!conversation || !transferToUserId) return;

    try {
      const updatedConversation = await conversationsService.transferConversation(
        conversation.id,
        transferToUserId
      );
      onUpdate(updatedConversation);
      setShowTransferModal(false);
      setTransferToUserId('');
    } catch (error: any) {
      console.error('Erro ao transferir conversa:', error);
    }
  };

  const handleCloseConversation = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.closeConversation(conversation.id);
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao fechar conversa:', error);
    }
  };

  const handleReopenConversation = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.reopenConversation(conversation.id);
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao reabrir conversa:', error);
    }
  };

  const handleArchive = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.archiveConversation(conversation.id);
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao arquivar conversa:', error);
    }
  };

  const handleUnarchive = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.unarchiveConversation(conversation.id);
      onUpdate(updatedConversation);
    } catch (error: any) {
      console.error('Erro ao desarquivar conversa:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!conversation) return;

    try {
      const updatedConversation = await conversationsService.addNote(conversation.id, note);
      onUpdate(updatedConversation);
      setEditingNote(false);
    } catch (error: any) {
      console.error('Erro ao salvar observação:', error);
    }
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!conversation || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {conversation.contact.name || conversation.contact.phoneNumber}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(conversation.status)}
                {getPriorityBadge(conversation.priority)}
                {conversation.assignedTo && (
                  <span className="text-sm text-gray-400">
                    Atendido por {conversation.assignedTo.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {conversation.status === 'OPEN' && !conversation.assignedTo && (
              <button
                onClick={handleAssign}
                className="btn btn-primary btn-sm"
                title="Assumir conversa"
              >
                <UserCheck className="w-4 h-4" />
              </button>
            )}
            
            {conversation.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="btn btn-secondary btn-sm"
                title="Transferir conversa"
              >
                <UserX className="w-4 h-4" />
              </button>
            )}
            
            {conversation.status === 'IN_PROGRESS' && (
              <button
                onClick={handleCloseConversation}
                className="btn btn-success btn-sm"
                title="Fechar conversa"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            
            {conversation.status === 'CLOSED' && (
              <button
                onClick={handleReopenConversation}
                className="btn btn-warning btn-sm"
                title="Reabrir conversa"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={conversation.status === 'ARCHIVED' ? handleUnarchive : handleArchive}
              className="btn btn-ghost btn-sm"
              title={conversation.status === 'ARCHIVED' ? 'Desarquivar' : 'Arquivar'}
            >
              {conversation.status === 'ARCHIVED' ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar com informações */}
          <div className="w-80 bg-gray-900 p-4 border-r border-gray-700 overflow-y-auto">
            {/* Informações do contato */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Informações do Contato
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">
                    {conversation.contact.name || 'Nome não informado'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">
                    {conversation.contact.phoneNumber}
                  </span>
                </div>
                
                {conversation.contact.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white">
                      {conversation.contact.email}
                    </span>
                  </div>
                )}
                
                {conversation.contact.company && (
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white">
                      {conversation.contact.company}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {conversation.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  Observações
                </h3>
                <button
                  onClick={() => setEditingNote(!editingNote)}
                  className="btn btn-ghost btn-xs"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
              
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="textarea textarea-sm w-full"
                    rows={4}
                    placeholder="Adicionar observação..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNote}
                      className="btn btn-primary btn-xs"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(false);
                        setNote(conversation.notes || '');
                      }}
                      className="btn btn-ghost btn-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300">
                  {note || 'Nenhuma observação adicionada.'}
                </p>
              )}
            </div>
          </div>

          {/* Área de mensagens */}
          <div className="flex-1 flex flex-col">
            {/* Lista de mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="spinner"></div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                        message.direction === 'OUTBOUND'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-white'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <button className="btn btn-ghost btn-sm">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="input flex-1"
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="btn btn-primary btn-sm"
                >
                  {isSending ? (
                    <div className="spinner w-4 h-4"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">
              Transferir Conversa
            </h3>
            
            <select
              value={transferToUserId}
              onChange={(e) => setTransferToUserId(e.target.value)}
              className="select select-bordered w-full mb-4"
            >
              <option value="">Selecione um operador</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            
            <div className="flex space-x-2">
              <button
                onClick={handleTransfer}
                disabled={!transferToUserId}
                className="btn btn-primary"
              >
                Transferir
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationModal;
