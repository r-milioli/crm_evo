import React from 'react';
import { Download } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-gray-400">Analise o desempenho do seu CRM</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Relatório de Mensagens</h3>
            <button className="btn btn-secondary">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Gráfico de mensagens</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Relatório de Contatos</h3>
            <button className="btn btn-secondary">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Gráfico de contatos</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Relatório de Campanhas</h3>
            <button className="btn btn-secondary">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48 bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-400">Gráfico de campanhas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
