import React from 'react';
import { 
  MessageCircle, 
  Users, 
  Phone, 
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  // Dados mockados para demonstração
  const metrics = [
    {
      title: 'Total de Mensagens',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: MessageCircle,
      color: 'bg-blue-500'
    },
    {
      title: 'Contatos Ativos',
      value: '567',
      change: '+8%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Instâncias Conectadas',
      value: '3',
      change: '0%',
      changeType: 'neutral',
      icon: Phone,
      color: 'bg-green-500'
    },
    {
      title: 'Taxa de Resposta',
      value: '94%',
      change: '+2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ];

  const recentActivities = [
    {
      type: 'message',
      title: 'Nova mensagem recebida',
      description: 'João Silva enviou uma mensagem',
      time: '2 min atrás',
      status: 'new'
    },
    {
      type: 'contact',
      title: 'Novo contato adicionado',
      description: 'Maria Santos foi adicionada',
      time: '5 min atrás',
      status: 'success'
    },
    {
      type: 'instance',
      title: 'Instância conectada',
      description: 'WhatsApp Business conectado',
      time: '10 min atrás',
      status: 'success'
    },
    {
      type: 'campaign',
      title: 'Campanha iniciada',
      description: 'Promoção de verão enviada',
      time: '1 hora atrás',
      status: 'info'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Visão geral do seu CRM WhatsApp</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{metric.title}</p>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm ${
                      metric.changeType === 'positive' ? 'text-green-500' : 
                      metric.changeType === 'negative' ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">vs mês passado</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${metric.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de mensagens */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Mensagens por Período</h3>
          <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Gráfico de mensagens será implementado aqui</p>
          </div>
        </div>

        {/* Atividades recentes */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                <div className="mt-1">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{activity.title}</p>
                  <p className="text-sm text-gray-400">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary">
            <MessageCircle className="w-4 h-4 mr-2" />
            Nova Mensagem
          </button>
          <button className="btn btn-secondary">
            <Users className="w-4 h-4 mr-2" />
            Adicionar Contato
          </button>
          <button className="btn btn-outline">
            <Phone className="w-4 h-4 mr-2" />
            Conectar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
