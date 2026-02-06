import React, { useState } from 'react';
import { Rock, KeyResult } from '../types';
import { generateRockPlan } from '../services/geminiService';
import {
    Plus, Target, Mountain, CheckCircle2, Circle,
    Sparkles, Loader2, ChevronRight, Trash2, X, Flag,
    AlertTriangle, Check, ArrowRight, Edit2, Save
} from 'lucide-react';
import { ConfirmModalConfig } from './ConfirmModal';

interface RockManagerProps {
    rocks: Rock[];
    onAddRock: (rock: Rock) => void;
    onUpdateRock: (rock: Rock) => void;
    onDeleteRock: (id: string) => void;

    // Notification Props
    requestConfirm: (config: Omit<ConfirmModalConfig, 'isOpen' | 'onConfirm' | 'onCancel'> & { onConfirm: () => void; onCancel?: () => void }) => void;
}

const RockManager: React.FC<RockManagerProps> = ({
    rocks,
    onAddRock,
    onUpdateRock,
    onDeleteRock,
    requestConfirm
}) => {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
    const [currentQuarter, setCurrentQuarter] = useState<string>(() => {
        const d = new Date();
        const q = Math.floor((d.getMonth() + 3) / 3);
        return `Q${q} ${d.getFullYear()}`;
    });

    // Creation State
    const [newRockInput, setNewRockInput] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [generatedRock, setGeneratedRock] = useState<{ title: string; description: string; keyResults: { title: string }[] } | null>(null);

    // Edit State for Detail View
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editDescription, setEditDescription] = useState('');
    const [editingKeyResultId, setEditingKeyResultId] = useState<string | null>(null);
    const [editKeyResultTitle, setEditKeyResultTitle] = useState('');
    const [isAddingKeyResult, setIsAddingKeyResult] = useState(false);
    const [newKeyResultTitle, setNewKeyResultTitle] = useState('');

    const handleCreateClick = () => {
        setNewRockInput('');
        setGeneratedRock(null);
        setView('create');
    };

    const handleGeneratePlan = async () => {
        if (!newRockInput) return;
        setIsAiGenerating(true);
        const plan = await generateRockPlan(newRockInput);
        setGeneratedRock(plan);
        setIsAiGenerating(false);
    };

    const handleFinalizeCreate = () => {
        if (!generatedRock) return;

        // Defensive check: Ensure keyResults exists
        const krs = generatedRock.keyResults || [];
        const keyResults: KeyResult[] = krs.map((kr, idx) => ({
            id: Math.random().toString(36).substr(2, 9),
            title: kr.title,
            isCompleted: false
        }));

        const newRock: Rock = {
            id: Math.random().toString(36).substr(2, 9),
            title: generatedRock.title,
            description: generatedRock.description,
            status: 'on-track',
            quarter: currentQuarter,
            keyResults: keyResults,
            createdAt: Date.now()
        };

        onAddRock(newRock);
        setView('list');
    };

    const handleRockClick = (rock: Rock) => {
        setSelectedRock(rock);
        setView('detail');
    };

    const handleDeleteRock = () => {
        if (!selectedRock) return;

        requestConfirm({
            title: 'Delete Rock?',
            message: `Are you sure you want to delete this Rock ("${selectedRock.title}")? This removes it from your quarterly goals. This action cannot be undone.`,
            confirmLabel: 'Delete Rock',
            variant: 'danger',
            onConfirm: () => {
                onDeleteRock(selectedRock.id);
                setView('list');
                setSelectedRock(null);
            }
        });
    }

    const toggleKeyResult = (krId: string) => {
        if (!selectedRock) return;
        const krs = selectedRock.keyResults || [];
        const updatedKeyResults = krs.map(kr =>
            kr.id === krId ? { ...kr, isCompleted: !kr.isCompleted } : kr
        );
        const updatedRock = { ...selectedRock, keyResults: updatedKeyResults };

        if (updatedKeyResults.length > 0 && updatedKeyResults.every(k => k.isCompleted) && updatedRock.status !== 'completed') {
            updatedRock.status = 'completed';
        }

        onUpdateRock(updatedRock);
        setSelectedRock(updatedRock);
    };

    // --- Edit Handlers ---
    const startEditTitle = () => {
        if (!selectedRock) return;
        setEditTitle(selectedRock.title);
        setIsEditingTitle(true);
    };

    const saveTitle = () => {
        if (!selectedRock || !editTitle.trim()) return;
        const updated = { ...selectedRock, title: editTitle.trim() };
        onUpdateRock(updated);
        setSelectedRock(updated);
        setIsEditingTitle(false);
    };

    const startEditDescription = () => {
        if (!selectedRock) return;
        setEditDescription(selectedRock.description);
        setIsEditingDescription(true);
    };

    const saveDescription = () => {
        if (!selectedRock) return;
        const updated = { ...selectedRock, description: editDescription };
        onUpdateRock(updated);
        setSelectedRock(updated);
        setIsEditingDescription(false);
    };

    const startEditKeyResult = (kr: KeyResult) => {
        setEditingKeyResultId(kr.id);
        setEditKeyResultTitle(kr.title);
    };

    const saveKeyResultEdit = () => {
        if (!selectedRock || !editingKeyResultId || !editKeyResultTitle.trim()) return;
        const krs = selectedRock.keyResults || [];
        const updatedKeyResults = krs.map(kr =>
            kr.id === editingKeyResultId ? { ...kr, title: editKeyResultTitle.trim() } : kr
        );
        const updated = { ...selectedRock, keyResults: updatedKeyResults };
        onUpdateRock(updated);
        setSelectedRock(updated);
        setEditingKeyResultId(null);
    };

    const handleAddKeyResult = () => {
        if (!selectedRock || !newKeyResultTitle.trim()) return;
        const newKR: KeyResult = {
            id: Math.random().toString(36).substr(2, 9),
            title: newKeyResultTitle.trim(),
            isCompleted: false
        };
        const updated = { ...selectedRock, keyResults: [...(selectedRock.keyResults || []), newKR] };
        onUpdateRock(updated);
        setSelectedRock(updated);
        setNewKeyResultTitle('');
        setIsAddingKeyResult(false);
    };

    const handleDeleteKeyResult = (krId: string, krTitle: string) => {
        if (!selectedRock) return;
        requestConfirm({
            title: 'Delete Key Result?',
            message: `Are you sure you want to delete "${krTitle}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                const krs = selectedRock.keyResults || [];
                const updated = { ...selectedRock, keyResults: krs.filter(kr => kr.id !== krId) };
                onUpdateRock(updated);
                setSelectedRock(updated);
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'on-track': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            case 'at-risk': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            case 'off-track': return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'completed': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'on-track': return 'On Track';
            case 'at-risk': return 'At Risk';
            case 'off-track': return 'Off Track';
            case 'completed': return 'Completed';
            default: return status;
        }
    };

    // --- Views ---

    const renderCreate = () => (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Establish New Rock</h2>
                    <p className="text-slate-400">Define a SMART quarterly goal using AI assistance.</p>
                </div>
                <button onClick={() => setView('list')} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X /></button>
            </div>

            <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-8 relative overflow-hidden min-h-[400px]">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Mountain size={150} /></div>

                {!generatedRock ? (
                    <div className="space-y-6 relative z-10 h-full flex flex-col justify-center">
                        <div className="text-center space-y-2 mb-4">
                            <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
                            <h3 className="text-xl font-bold text-white">What do you want to achieve this quarter?</h3>
                            <p className="text-slate-400 text-sm">Describe your goal loosely (e.g. "Fix our onboarding process" or "Improve system reliability").</p>
                        </div>

                        <textarea
                            value={newRockInput}
                            onChange={(e) => setNewRockInput(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-white h-32 focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                            placeholder="I want to..."
                            autoFocus
                        />
                        <button
                            onClick={handleGeneratePlan}
                            disabled={isAiGenerating || !newRockInput}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                        >
                            {isAiGenerating ? <Loader2 className="animate-spin" /> : <Target size={20} />}
                            Refine to SMART Rock
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-right-8">
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Rock Title</h3>
                            <div className="text-xl font-bold text-white flex gap-3 items-start">
                                <Mountain className="shrink-0 mt-1 text-indigo-400" />
                                {generatedRock.title}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Context</h3>
                            <p className="text-slate-300">{generatedRock.description}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Key Results (Success Criteria)</h3>
                            <div className="space-y-2">
                                {(generatedRock.keyResults || []).map((kr, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded bg-slate-800/80 border border-slate-700/50">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                        <p className="text-sm font-medium text-slate-200">{kr.title}</p>
                                    </div>
                                ))}
                                {(!generatedRock.keyResults || generatedRock.keyResults.length === 0) && (
                                    <p className="text-slate-500 text-sm italic">No key results generated.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setGeneratedRock(null)}
                                className="flex-1 py-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleFinalizeCreate}
                                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check size={20} /> Accept & Commit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderDetail = () => {
        if (!selectedRock) return null;

        const krs = selectedRock.keyResults || [];
        const completedKRs = krs.filter(kr => kr.isCompleted).length;
        const progress = krs.length > 0 ? Math.round((completedKRs / krs.length) * 100) : 0;

        return (
            <div className="animate-in fade-in slide-in-from-right-4 space-y-6 max-w-4xl mx-auto">
                <button onClick={() => setView('list')} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-4">
                    <ChevronRight className="rotate-180" size={16} /> Back to Rocks
                </button>

                {/* Rock Header Card */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex justify-between items-start relative z-10 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-slate-300 uppercase tracking-wider border border-slate-600">
                                    {selectedRock.quarter}
                                </span>
                                <select
                                    value={selectedRock.status}
                                    onChange={(e) => {
                                        const updated = { ...selectedRock, status: e.target.value as any };
                                        onUpdateRock(updated);
                                        setSelectedRock(updated);
                                    }}
                                    className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider cursor-pointer outline-none focus:ring-1 focus:ring-white/50 appearance-none text-center min-w-[100px] ${getStatusColor(selectedRock.status)}`}
                                >
                                    <option value="on-track">On Track</option>
                                    <option value="at-risk">At Risk</option>
                                    <option value="off-track">Off Track</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            {/* Editable Title */}
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-2xl md:text-3xl font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                    <button onClick={saveTitle} className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-lg"><Save size={20} /></button>
                                    <button onClick={() => setIsEditingTitle(false)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg"><X size={20} /></button>
                                </div>
                            ) : (
                                <div className="group/title flex items-start gap-2 mb-4">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{selectedRock.title}</h1>
                                    <button onClick={startEditTitle} className="p-1.5 text-slate-500 hover:text-white opacity-0 group-hover/title:opacity-100 transition-opacity rounded hover:bg-slate-700"><Edit2 size={16} /></button>
                                </div>
                            )}
                            {/* Editable Description */}
                            {isEditingDescription ? (
                                <div className="flex items-start gap-2">
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 text-lg resize-none"
                                        rows={3}
                                        autoFocus
                                    />
                                    <button onClick={saveDescription} className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-lg"><Save size={20} /></button>
                                    <button onClick={() => setIsEditingDescription(false)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg"><X size={20} /></button>
                                </div>
                            ) : (
                                <div className="group/desc flex items-start gap-2">
                                    <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">{selectedRock.description}</p>
                                    <button onClick={startEditDescription} className="p-1.5 text-slate-500 hover:text-white opacity-0 group-hover/desc:opacity-100 transition-opacity rounded hover:bg-slate-700 shrink-0"><Edit2 size={14} /></button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleDeleteRock}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Rock"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <span>Progress to Completion</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className={`h-full transition-all duration-1000 ${selectedRock.status === 'off-track' ? 'bg-red-500' :
                                    selectedRock.status === 'at-risk' ? 'bg-amber-500' :
                                        selectedRock.status === 'completed' ? 'bg-indigo-500' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Key Results Checklist */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Target className="text-indigo-400" size={24} /> Key Results
                        </h3>
                        <button
                            onClick={() => setIsAddingKeyResult(true)}
                            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> Add Key Result
                        </button>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700/50">
                        {krs.map((kr) => {
                            const isEditing = editingKeyResultId === kr.id;
                            return (
                                <div
                                    key={kr.id}
                                    className={`group p-5 flex items-start gap-4 hover:bg-slate-700/30 transition-colors ${kr.isCompleted ? 'bg-slate-800/80' : ''}`}
                                >
                                    <button
                                        onClick={() => toggleKeyResult(kr.id)}
                                        className={`mt-0.5 transition-colors ${kr.isCompleted ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {kr.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editKeyResultTitle}
                                                    onChange={(e) => setEditKeyResultTitle(e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                    autoFocus
                                                />
                                                <button onClick={saveKeyResultEdit} className="p-1.5 text-emerald-400 hover:text-emerald-300"><Save size={16} /></button>
                                                <button onClick={() => setEditingKeyResultId(null)} className="p-1.5 text-slate-500 hover:text-red-400"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <p className={`text-base font-medium transition-all ${kr.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                {kr.title}
                                            </p>
                                        )}
                                    </div>

                                    {!isEditing && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startEditKeyResult(kr); }}
                                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteKeyResult(kr.id, kr.title); }}
                                                className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-red-900/20"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add Key Result Input */}
                        {isAddingKeyResult && (
                            <div className="p-5 flex items-center gap-4 bg-slate-900/50">
                                <Circle size={24} className="text-slate-600" />
                                <input
                                    type="text"
                                    value={newKeyResultTitle}
                                    onChange={(e) => setNewKeyResultTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyResult()}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter key result..."
                                    autoFocus
                                />
                                <button onClick={handleAddKeyResult} disabled={!newKeyResultTitle.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">Add</button>
                                <button onClick={() => { setIsAddingKeyResult(false); setNewKeyResultTitle(''); }} className="p-2 text-slate-500 hover:text-red-400"><X size={20} /></button>
                            </div>
                        )}

                        {krs.length === 0 && !isAddingKeyResult && (
                            <div className="p-5 text-center text-slate-500 italic">No key results defined.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderList = () => {
        const sortedRocks = [...rocks].sort((a, b) => b.createdAt - a.createdAt);

        return (
            <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Quarterly Rocks</h2>
                        <p className="text-slate-400">Your 90-day strategic priorities. Specific, Measurable, Achievable.</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="text-sm font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                            {currentQuarter}
                        </div>
                        <button
                            onClick={handleCreateClick}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
                        >
                            <Plus size={20} /> Establish Rock
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedRocks.map(rock => {
                        const krs = rock.keyResults || [];
                        const completedKRs = krs.filter(kr => kr.isCompleted).length;
                        const totalKRs = krs.length;
                        const progress = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : 0;

                        return (
                            <div
                                key={rock.id}
                                onClick={() => handleRockClick(rock)}
                                className="bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${rock.status === 'off-track' ? 'bg-red-500' :
                                    rock.status === 'at-risk' ? 'bg-amber-500' :
                                        rock.status === 'completed' ? 'bg-indigo-500' : 'bg-emerald-500'
                                    }`}></div>

                                <div className="flex justify-between items-start mb-4 pl-3">
                                    <div className="flex items-center gap-2">
                                        <Mountain className="text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{rock.quarter}</span>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(rock.status)}`}>
                                        {getStatusLabel(rock.status)}
                                    </div>
                                </div>

                                <div className="pl-3 mb-6">
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 h-14">{rock.title}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 h-10">{rock.description}</p>
                                </div>

                                <div className="pl-3 space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                                        <span>{completedKRs}/{totalKRs} Key Results</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${rock.status === 'off-track' ? 'bg-red-500' :
                                                rock.status === 'at-risk' ? 'bg-amber-500' :
                                                    rock.status === 'completed' ? 'bg-indigo-500' : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {rocks.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 bg-slate-900/50">
                            <Flag size={48} className="mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-slate-400 mb-1">No Rocks Set for {currentQuarter}</h3>
                            <p className="mb-6">Establish your top priorities to ensure a productive quarter.</p>
                            <button
                                onClick={handleCreateClick}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium border border-slate-700 transition-colors"
                            >
                                Create First Rock
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div id="rock-manager" className="p-6 pb-20">
            {view === 'list' && renderList()}
            {view === 'create' && renderCreate()}
            {view === 'detail' && renderDetail()}
        </div>
    );
};

export default RockManager;