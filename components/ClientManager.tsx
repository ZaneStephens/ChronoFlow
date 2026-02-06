
import React, { useState } from 'react';
import { Client } from '../types';
import { Plus, Trash2, Briefcase, Mail, User, FileText, ChevronDown, ChevronUp, Edit2, X, Save, ShieldCheck } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isInternal, setIsInternal] = useState(false);
  
  // Optional Fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [services, setServices] = useState('');

  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Sort clients A-Z
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  const handleEditClick = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setColor(client.color);
    setIsInternal(client.isInternal || false);
    setContactName(client.contactName || '');
    setContactEmail(client.contactEmail || '');
    setServices(client.services || '');
    
    // Scroll to top to see form
    const formElement = document.getElementById('client-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setColor('#6366f1');
    setIsInternal(false);
    setContactName('');
    setContactEmail('');
    setServices('');
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingId) {
        onUpdateClient({
            id: editingId,
            name,
            color,
            isInternal,
            contactName,
            contactEmail,
            services
        });
    } else {
        onAddClient({
            name,
            color,
            isInternal,
            contactName,
            contactEmail,
            services
        });
    }
    resetForm();
  };

  const toggleExpand = (id: string) => {
    setExpandedClientId(expandedClientId === id ? null : id);
  };

  return (
    <div id="client-manager" className="space-y-8 p-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Client Management</h2>
        <p className="text-slate-400 text-sm">Organize your portfolio and client details.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div id="client-form" className={`bg-slate-800 rounded-xl border ${editingId ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700'} p-6 h-fit transition-all duration-300`}>
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? <Edit2 size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                {editingId ? 'Edit Client' : 'Add New Client'}
              </h3>
              {editingId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-sm bg-slate-700 px-2 py-1 rounded"
                  >
                      <X size={14} /> Cancel
                  </button>
              )}
          </div>

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
               <div className="flex items-end">
                   <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-700 rounded-lg px-4 h-10 w-full hover:bg-slate-800 transition-colors">
                       <input 
                         type="checkbox" 
                         checked={isInternal} 
                         onChange={(e) => setIsInternal(e.target.checked)}
                         className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                       />
                       <span className="text-sm text-slate-300 select-none">Internal Work</span>
                   </label>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              className={`w-full font-medium py-2 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 ${
                  editingId 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-slate-700 hover:bg-indigo-600 text-white'
              }`}
            >
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Update Client' : 'Create Client'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="space-y-4">
          {sortedClients.map(client => {
            const isExpanded = expandedClientId === client.id;
            const isEditing = editingId === client.id;
            
            return (
              <div 
                key={client.id} 
                className={`bg-slate-800/50 rounded-xl border overflow-hidden group transition-all duration-300 ${
                    isEditing ? 'border-indigo-500 shadow-lg shadow-indigo-900/20 opacity-60 pointer-events-none' : 'border-slate-700 hover:border-indigo-500/50'
                }`}
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => !isEditing && toggleExpand(client.id)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-900 font-bold text-xl shrink-0"
                      style={{ backgroundColor: client.color }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-semibold">{client.name}</h4>
                        {client.isInternal && (
                            <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600 flex items-center gap-1">
                                <ShieldCheck size={10} /> INTERNAL
                            </span>
                        )}
                      </div>
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
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(client); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit Client"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteClient(client.id); }}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 size={18} />
                      </button>
                  </div>
                </div>

                {isExpanded && (client.contactName || client.contactEmail || client.services) && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 bg-slate-900/30 animate-in slide-in-from-top-2">
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