import React, { useState } from 'react';
import { Client } from '../types';
import { Plus, Trash2, Briefcase, Mail, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onDeleteClient: (id: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onDeleteClient }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  
  // Optional Fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [services, setServices] = useState('');

  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAddClient({
      name,
      color,
      contactName,
      contactEmail,
      services
    });
    setName('');
    setContactName('');
    setContactEmail('');
    setServices('');
  };

  const toggleExpand = (id: string) => {
    setExpandedClientId(expandedClientId === id ? null : id);
  };

  return (
    <div id="client-manager" className="space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Client Management</h2>
        <p className="text-slate-400 text-sm">Organize your portfolio and client details.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-fit">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={20} className="text-indigo-400" />
            Add New Client
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Client Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. Acme Corp"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Tag Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-full bg-slate-900 border border-slate-700 rounded-lg cursor-pointer"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    placeholder="Optional"
                  />
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Services Covered</label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm h-20 resize-none"
                placeholder="e.g. Server Maintenance, M365 Support..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors mt-2"
            >
              Create Client
            </button>
          </form>
        </div>

        {/* List */}
        <div className="space-y-4">
          {clients.map(client => {
            const isExpanded = expandedClientId === client.id;
            return (
              <div key={client.id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden group hover:border-indigo-500/50 transition-colors">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(client.id)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-900 font-bold text-xl shrink-0"
                      style={{ backgroundColor: client.color }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{client.name}</h4>
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
                        <span>ID: {client.id.substring(0,6)}</span>
                        {(client.contactName || client.services) && (
                            <span className="text-indigo-400 flex items-center gap-0.5">
                               {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                               {isExpanded ? 'Hide Details' : 'View Details'}
                            </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteClient(client.id); }}
                    className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {isExpanded && (client.contactName || client.contactEmail || client.services) && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 bg-slate-900/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {(client.contactName || client.contactEmail) && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</h5>
                                {client.contactName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <User size={14} className="text-indigo-400" />
                                        {client.contactName}
                                    </div>
                                )}
                                {client.contactEmail && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <Mail size={14} className="text-indigo-400" />
                                        {client.contactEmail}
                                    </div>
                                )}
                            </div>
                        )}
                        {client.services && (
                            <div className="space-y-2">
                                <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Services</h5>
                                <div className="flex items-start gap-2 text-sm text-slate-300">
                                    <FileText size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                    <p className="whitespace-pre-wrap">{client.services}</p>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {clients.length === 0 && (
            <div className="text-center text-slate-500 py-10 border-2 border-dashed border-slate-800 rounded-xl">
              <Briefcase size={40} className="mx-auto mb-2 opacity-20" />
              <p>No clients yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientManager;