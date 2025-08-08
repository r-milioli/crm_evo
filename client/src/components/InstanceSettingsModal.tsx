import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import instancesService from '../services/instancesService';
import { Instance } from '../services/instancesService';

interface InstanceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: Instance | null;
}

interface InstanceSettings {
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  syncFullHistory?: boolean;
  readStatus?: boolean;
}

const InstanceSettingsModal: React.FC<InstanceSettingsModalProps> = ({
  isOpen,
  onClose,
  instance
}) => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<InstanceSettings>({});

  // Buscar configurações da instância
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['instance-settings', instance?.id],
    queryFn: () => instancesService.getInstanceSettings(instance!.id),
    enabled: isOpen && !!instance && instance.status === 'CONNECTED',
    refetchOnWindowFocus: false
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: InstanceSettings }) =>
      instancesService.updateInstanceSettings(id, settings),
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['instance-settings', instance?.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar configurações');
    }
  });

  // Atualizar settings quando os dados são carregados
  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const handleInputChange = (field: keyof InstanceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instance) return;

    updateSettingsMutation.mutate({
      id: instance.id,
      settings
    });
  };

  const handleClose = () => {
    setSettings({});
    onClose();
  };

  if (!isOpen || !instance) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            Configurações da Instância: {instance.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {instance.status !== 'CONNECTED' ? (
          <div className="text-center py-8">
            <div className="text-yellow-500 mb-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin" />
            </div>
            <p className="text-gray-400">
              A instância deve estar conectada para acessar as configurações.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Status atual: {instance.status}
            </p>
          </div>
        ) : isLoadingSettings ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
            <p className="text-gray-400 mt-2">Carregando configurações...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rejeitar Chamadas */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Rejeitar Chamadas
                </label>
                <p className="text-sm text-gray-400">
                  Rejeita automaticamente chamadas de voz
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.rejectCall || false}
                  onChange={(e) => handleInputChange('rejectCall', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Mensagem de Chamada */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Mensagem de Chamada
              </label>
              <input
                type="text"
                value={settings.msgCall || ''}
                onChange={(e) => handleInputChange('msgCall', e.target.value)}
                placeholder="Mensagem exibida quando rejeitar chamadas"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Ignorar Grupos */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Ignorar Grupos
                </label>
                <p className="text-sm text-gray-400">
                  Ignora mensagens de grupos
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.groupsIgnore || false}
                  onChange={(e) => handleInputChange('groupsIgnore', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Sempre Online */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Sempre Online
                </label>
                <p className="text-sm text-gray-400">
                  Mantém a instância sempre online
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alwaysOnline || false}
                  onChange={(e) => handleInputChange('alwaysOnline', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Ler Mensagens */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Ler Mensagens
                </label>
                <p className="text-sm text-gray-400">
                  Marca mensagens como lidas automaticamente
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.readMessages || false}
                  onChange={(e) => handleInputChange('readMessages', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Sincronizar Histórico Completo */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Sincronizar Histórico Completo
                </label>
                <p className="text-sm text-gray-400">
                  Sincroniza todo o histórico de mensagens
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.syncFullHistory || false}
                  onChange={(e) => handleInputChange('syncFullHistory', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Ler Status */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Ler Status
                </label>
                <p className="text-sm text-gray-400">
                  Lê status de outros usuários
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.readStatus || false}
                  onChange={(e) => handleInputChange('readStatus', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InstanceSettingsModal;
