import React from 'react';
import { Plus, Megaphone, Play, Pause, Trash2 } from 'lucide-react';

const Campaigns: React.FC = () => {
  const campaigns = [
    {
      id: '1',
      name: 'Promoção de Verão',
      status: 'active',
      recipients: 150,
      sent: 120,
      opened: 85,
      scheduled: '2024-01-15 10:00'
    },
    {
      id: '2',
      name: 'Novos Produtos',
      status: 'scheduled',
      recipients: 200,
      sent: 0,
      opened: 0,
      scheduled: '2024-01-20 14:00'
    },
    {
      id: '3',
      name: 'Fidelização',
      status: 'completed',
      recipients: 100,
      sent: 100,
      opened: 75,
      scheduled: '2024-01-10 09:00'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Ativa</span>;
      case 'scheduled':
        return <span className="badge badge-warning">Agendada</span>;
      case 'completed':
        return <span className="badge badge-info">Concluída</span>;
      default:
        return <span className="badge badge-secondary">Desconhecido</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-gray-400">Gerencie suas campanhas de marketing</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-whatsapp-500 rounded-lg">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  {getStatusBadge(campaign.status)}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Destinatários:</span>
                <span className="text-white">{campaign.recipients}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Enviadas:</span>
                <span className="text-white">{campaign.sent}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Abertas:</span>
                <span className="text-white">{campaign.opened}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Agendada:</span>
                <span className="text-white">{campaign.scheduled}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              {campaign.status === 'scheduled' && (
                <button className="btn btn-primary flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar
                </button>
              )}
              {campaign.status === 'active' && (
                <button className="btn btn-secondary flex-1">
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </button>
              )}
              <button className="btn btn-danger">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Campaigns;
