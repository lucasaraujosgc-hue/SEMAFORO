
import React, { useState, useRef } from 'react';
import { X, Trash2, Plus, Lock, TrendingUp, TrendingDown, Minus, History, ShieldAlert, Target, AlertTriangle, Calendar, FileText, Info, ListChecks, Clock, CheckCircle2, AlertCircle, ClipboardList, Pencil, BookOpen, AlertOctagon, GraduationCap, Link as LinkIcon, PieChart, BarChart, LineChart, GripVertical, Filter } from 'lucide-react';
import { ChartConfig, Post, TopicId, SemaforoConfig, ProgressUpdate, ReportSection } from '../types';
import { TOPICS } from '../constants';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  onAddPost: (topicId: TopicId, description: string, chartConfig: ChartConfig, extra: any) => Promise<boolean | void>;
  onEditPost: (postId: string, topicId: TopicId, description: string, chartConfig: ChartConfig, extra: any) => Promise<boolean | void>;
  onDeletePost: (postId: string) => void;
  usingServer: boolean;
}

const INITIAL_REPORT: ReportSection = {
  // Novos campos estratégicos
  objetivo: '', importanciaPrefeito: '', formula: '', acaoCrise: '',
  responsavelTecnico: '', 

  secretaria: '', periodo: '', responsavelPolitico: '', 
  pontoFocal: { nome: '', cargo: '', telefone: '', email: '' },
  resumoAvanços: '', resumoAtrasos: '', resumoDecisoes: '',
  indicadoresChave: [], metasPrioritarias: [], problemasCriticos: [], decisoesPrefeito: [],
  riscos: { tipos: [], descricao: '' }, compromissos: [], anexos: ''
};

const INITIAL_SEMAFORO: SemaforoConfig = {
  green: 'Matrículas consolidadas e validadas no sistema',
  yellow: 'Pendências de validação / risco de inconsistência',
  red: 'Matrículas não lançadas ou rejeitadas pelo sistema'
};

const USERS_MAP: Record<string, string> = {
  'azul': 'Lucas Araujo dos Santos',
  'amarelo': 'Gilda Natali Mendes dos Santos Lemos',
  'preto': 'Ana Paula Daltro Oliveira',
  'rosa': 'Maiara dos Santos Maia'
};

// --- Helpers de Formatação ---
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const handleCurrencyInput = (value: string): number => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '');
  // Divide por 100 para considerar os centavos
  return (parseInt(digits) || 0) / 100;
};
// -----------------------------

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, onClose, posts, onAddPost, onEditPost, onDeletePost
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [formStep, setFormStep] = useState<number>(1);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Filter State
  const [filterTopic, setFilterTopic] = useState<string>('all');

  // Drag and Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<TopicId>(TopicId.EDUCACAO);
  const [responsavel, setResponsavel] = useState('');
  const [fonteOficial, setFonteOficial] = useState('');
  const [recorrencia, setRecorrencia] = useState('Mensal');
  
  // Novo State: Semáforo Geral e Tipo de Gráfico
  const [semaforoGeral, setSemaforoGeral] = useState<'green'|'yellow'|'red'>('green');
  const [chartType, setChartType] = useState<'bar'|'line'|'pie'>('bar');

  const [semaforoRules, setSemaforoRules] = useState<SemaforoConfig>(INITIAL_SEMAFORO);
  const [report, setReport] = useState<ReportSection>(INITIAL_REPORT);
  const [progress, setProgress] = useState(0);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);
  
  // Builder rows: Agora suporta barValue e lineValue
  const [builderRows, setBuilderRows] = useState<any[]>([{ label: 'Mês 1', barValue: 0, lineValue: 0, color: '#10b981' }]);

  // Risco Personalizado
  const [customRiskInput, setCustomRiskInput] = useState('');
  const [isAddingCustomRisk, setIsAddingCustomRisk] = useState(false);

  // State para Nova Movimentação (Step 9)
  const [newMoveDate, setNewMoveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMovePct, setNewMovePct] = useState<number | ''>('');
  const [newMoveDone, setNewMoveDone] = useState('');
  const [newMoveMissing, setNewMoveMissing] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedPass = passwordInput.trim().toLowerCase();
    
    if (USERS_MAP[normalizedPass]) {
      setIsAuthenticated(true);
      setCurrentUser(USERS_MAP[normalizedPass]);
    } else {
      setLoginError('Senha incorreta.');
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post.id);
    setSelectedTopic(post.topicId);
    setTitle(post.chartConfig.title);
    setDescription(post.description);
    setResponsavel(post.responsavel || '');
    setFonteOficial(post.fonteOficial || '');
    setRecorrencia(post.recorrencia || 'Mensal');
    setSemaforoRules(post.semaforoRules || INITIAL_SEMAFORO);
    setSemaforoGeral(post.semaforoGeral || 'green');
    setChartType(post.chartConfig.type || 'bar');
    
    setReport({ ...INITIAL_REPORT, ...post.report });
    setProgress(post.progress || 0);
    setProgressHistory(post.progressHistory || []);

    // Adaptação para carregar dados antigos ou novos
    if (Array.isArray(post.chartConfig.data)) {
        const loadedData = post.chartConfig.data.map((d: any) => ({
            label: d.label,
            color: d.color || '#10b981',
            barValue: d.barValue !== undefined ? d.barValue : (d.Valor !== undefined ? d.Valor : 0),
            lineValue: d.lineValue || 0
        }));
        setBuilderRows(loadedData);
    } else {
        setBuilderRows([]);
    }
    
    setActiveTab('add');
    setFormStep(1);
  };

  const handleSubmit = async () => {
    // Detecta se estamos usando linha para mudar o tipo do gráfico internamente se necessário
    // Se o usuário selecionou 'bar' mas preencheu 'lineValue', forçamos um comportamento de composição no renderer
    
    const config: ChartConfig = { 
        type: chartType, 
        title, 
        data: builderRows // rows contém {label, barValue, lineValue, color}
    };
    
    const finalReport = {
      ...report,
      responsavelPolitico: responsavel,
    };
    
    const extra = { 
        responsavel, 
        fonteOficial, 
        recorrencia, 
        dataAtualizacao: Date.now(), 
        semaforoRules, 
        semaforoGeral, // Salva o status geral
        progress, 
        progressHistory, 
        report: finalReport,
        lastEditor: currentUser // Salva quem editou por último
    };
    
    let success;
    if (editingPostId) success = await onEditPost(editingPostId, selectedTopic, description, config, extra);
    else success = await onAddPost(selectedTopic, description, config, extra);
    
    if (success !== false) {
      setEditingPostId(null); setTitle(''); setReport(INITIAL_REPORT); setActiveTab('list');
      setBuilderRows([{ label: 'Mês 1', barValue: 0, lineValue: 0, color: '#10b981' }]); 
      setProgress(0); setProgressHistory([]);
    }
  };

  const addProgressMove = () => {
    if (newMovePct === '') return;
    const dateObj = new Date(newMoveDate);
    const utcDate = new Date(dateObj.valueOf() + dateObj.getTimezoneOffset() * 60000).getTime();

    const update: ProgressUpdate = {
      date: utcDate,
      percentage: Number(newMovePct),
      whatWasDone: newMoveDone,
      whatIsMissing: newMoveMissing
    };
    setProgress(Number(newMovePct));
    setProgressHistory([update, ...progressHistory]);
    setNewMovePct('');
    setNewMoveDone('');
    setNewMoveMissing('');
  };

  const addCustomRisk = () => {
    if (customRiskInput.trim()) {
        const newTypes = [...report.riscos.tipos, customRiskInput.trim()];
        setReport({...report, riscos: {...report.riscos, tipos: newTypes}});
        setCustomRiskInput('');
        setIsAddingCustomRisk(false);
    }
  };

  const filteredPosts = posts.filter(p => filterTopic === 'all' || p.topicId === filterTopic);

  // Drag and Drop Logic
  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const draggedIdx = dragItem.current;
    const overIdx = dragOverItem.current;
    
    if (draggedIdx === overIdx) return;

    // Reseta estado visual imediatamente
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(false);

    // ESTRATÉGIA DE ORDENAÇÃO
    let updates: Post[] = [];

    if (filterTopic === 'all') {
        // MODO GLOBAL: Reordena a lista completa e renumera índices sequencialmente (0, 1, 2...)
        const _posts = [...posts];
        const draggedContent = _posts.splice(draggedIdx, 1)[0];
        _posts.splice(overIdx, 0, draggedContent);

        for (let i = 0; i < _posts.length; i++) {
            if (_posts[i].order !== i) {
                updates.push({ ..._posts[i], order: i, lastEditor: currentUser });
            }
        }
    } else {
        // MODO FILTRADO: Estratégia "Troca de Slots"
        const currentVisible = [...filteredPosts];
        const availableSlots = currentVisible.map(p => p.order !== undefined ? p.order : 0);
        
        const draggedContent = currentVisible.splice(draggedIdx, 1)[0];
        currentVisible.splice(overIdx, 0, draggedContent);
        
        for (let i = 0; i < currentVisible.length; i++) {
            const p = currentVisible[i];
            const targetOrder = availableSlots[i];
            
            if (p.order !== targetOrder) {
                updates.push({ ...p, order: targetOrder, lastEditor: currentUser });
            }
        }
    }

    // Executa updates em série para garantir integridade
    for (const updatedPost of updates) {
        await onEditPost(updatedPost.id, updatedPost.topicId, updatedPost.description, updatedPost.chartConfig, {
            ...updatedPost,
            report: updatedPost.report,
            progress: updatedPost.progress,
            progressHistory: updatedPost.progressHistory,
            lastEditor: updatedPost.lastEditor,
            order: updatedPost.order
        });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-12 w-full max-w-sm text-center space-y-8 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20"><Lock className="text-emerald-400" size={32}/></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão Técnica</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input type="password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setLoginError(''); }} placeholder="Senha" className={`w-full p-4 bg-slate-950 border ${loginError ? 'border-red-500' : 'border-slate-800'} rounded-2xl text-white text-center font-black outline-none focus:ring-2 focus:ring-emerald-500`} autoFocus />
              {loginError && <p className="text-red-400 text-xs font-bold mt-2">{loginError}</p>}
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase hover:bg-emerald-500 transition-all">Acessar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] w-full max-w-6xl h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><ClipboardList className="text-emerald-500" /> Sala de Lançamento</h2>
            <div className="flex flex-col">
                 <span className="text-[10px] text-slate-500 font-bold uppercase">Logado como:</span>
                 <span className="text-xs text-emerald-400 font-black uppercase">{currentUser}</span>
            </div>
            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl">
              <button onClick={() => setActiveTab('add')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'add' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>{editingPostId ? 'Editar' : 'Novo'}</button>
              <button onClick={() => setActiveTab('list')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Catálogo</button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'add' && (
            <div className="w-64 bg-slate-900/30 border-r border-slate-800 p-6 flex flex-col gap-2 overflow-y-auto hidden md:flex">
              {[
                { id: 1, label: '1. Definição', icon: BookOpen },
                { id: 2, label: '2. Semáforo', icon: AlertOctagon },
                { id: 3, label: '3. Dados & Gráfico', icon: TrendingUp },
                { id: 4, label: '4. Resumo Exec.', icon: FileText },
                { id: 5, label: '5. Informações', icon: ListChecks }, 
                { id: 6, label: '6. Metas Priorit.', icon: Target },
                { id: 7, label: '7. Prob. & Decisões', icon: AlertTriangle },
                { id: 8, label: '8. Riscos', icon: ShieldAlert },
                { id: 9, label: '9. Histórico', icon: History },
              ].map(step => (
                <button key={step.id} onClick={() => setFormStep(step.id)} className={`flex items-center gap-3 p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${formStep === step.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                  <step.icon size={16} className={formStep === step.id ? 'text-emerald-400' : 'text-slate-600'} />
                  {step.label}
                </button>
              ))}
              <div className="mt-auto pt-6 border-t border-slate-800">
                <button onClick={handleSubmit} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all active:scale-95">Salvar</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            {activeTab === 'add' ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
                {/* ... (Conteúdo dos steps de 1 a 9 mantido igual, apenas omitido para brevidade) ... */}
                
                {formStep === 1 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">1. Definição Estratégica</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Nome do Indicador</label>
                         <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Área</label>
                         <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value as TopicId)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold">
                            {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                         </select>
                       </div>
                    </div>
                    
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Status Geral do Indicador (Aparece na Lista)</label>
                         <div className="flex gap-4">
                            {(['green', 'yellow', 'red'] as const).map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSemaforoGeral(color)}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${semaforoGeral === color 
                                        ? (color === 'green' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : color === 'yellow' ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-red-500 bg-red-500/20 text-red-400') 
                                        : 'border-slate-800 bg-slate-950 text-slate-600 hover:border-slate-700'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full ${color === 'green' ? 'bg-emerald-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    <span className="font-bold uppercase text-xs">{color === 'green' ? 'Normal' : color === 'yellow' ? 'Atenção' : 'Crítico'}</span>
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Objetivo</label>
                        <textarea value={report.objetivo} onChange={e => setReport({...report, objetivo: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" rows={2} />
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Por que é crítico?</label>
                        <textarea value={report.importanciaPrefeito} onChange={e => setReport({...report, importanciaPrefeito: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" rows={2} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Fórmula</label>
                            <input value={report.formula} onChange={e => setReport({...report, formula: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Fonte do Dado</label>
                            <input value={fonteOficial} onChange={e => setFonteOficial(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Periodicidade</label>
                            <input value={recorrencia} onChange={e => setRecorrencia(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Resp. Político</label>
                            <input value={responsavel} onChange={e => setResponsavel(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Resp. Técnico</label>
                            <input value={report.responsavelTecnico} onChange={e => setReport({...report, responsavelTecnico: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                        </div>
                    </div>
                  </div>
                )}
                
                {formStep === 2 && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">2. Regras de Calibração</h3>
                         <div className="space-y-6">
                            <div className="flex gap-4 items-start bg-emerald-950/20 p-6 rounded-2xl border border-emerald-900/50">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verde</label>
                                    <input value={semaforoRules.green} onChange={e => setSemaforoRules({...semaforoRules, green: e.target.value})} className="w-full p-3 bg-slate-950 border border-emerald-900/50 rounded-xl text-white text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-4 items-start bg-amber-950/20 p-6 rounded-2xl border border-amber-900/50">
                                <div className="w-8 h-8 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Amarelo</label>
                                    <input value={semaforoRules.yellow} onChange={e => setSemaforoRules({...semaforoRules, yellow: e.target.value})} className="w-full p-3 bg-slate-950 border border-amber-900/50 rounded-xl text-white text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-4 items-start bg-red-950/20 p-6 rounded-2xl border border-red-900/50">
                                <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Vermelho</label>
                                    <input value={semaforoRules.red} onChange={e => setSemaforoRules({...semaforoRules, red: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-xl text-white text-sm" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-800 mt-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 flex items-center gap-2"><ShieldAlert size={14}/> Ação Automática se Vermelho (Crise)</label>
                                <textarea value={report.acaoCrise} onChange={e => setReport({...report, acaoCrise: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" />
                            </div>
                        </div>
                    </div>
                )}
                {formStep === 3 && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">3. Dados e Visualização</h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">Tipo de Visualização</label>
                            <div className="flex gap-3">
                                {[
                                    {id: 'bar', label: 'Barras', icon: BarChart},
                                    {id: 'line', label: 'Linha', icon: LineChart},
                                    {id: 'pie', label: 'Pizza', icon: PieChart},
                                ].map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => setChartType(t.id as any)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase transition-all ${chartType === t.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'}`}
                                    >
                                        <t.icon size={16}/> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pontos de Dados</h4>
                            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                                {builderRows.map((r, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <div className="flex-1 min-w-[100px]">
                                         <input value={r.label} onChange={e => { const n = [...builderRows]; n[i].label = e.target.value; setBuilderRows(n); }} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs" placeholder="Rótulo (Ex: Jan)" />
                                    </div>
                                    <div className="w-32">
                                         <input 
                                            type="text" 
                                            value={formatCurrency(r.barValue || 0)} 
                                            onChange={e => { const n = [...builderRows]; n[i].barValue = handleCurrencyInput(e.target.value); setBuilderRows(n); }} 
                                            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-emerald-400 text-xs font-bold text-right" 
                                            placeholder="Valor" 
                                         />
                                    </div>
                                    {/* Opção para Linha/Meta */}
                                    <div className="w-32">
                                         <input 
                                            type="text" 
                                            value={formatCurrency(r.lineValue || 0)} 
                                            onChange={e => { const n = [...builderRows]; n[i].lineValue = handleCurrencyInput(e.target.value); setBuilderRows(n); }} 
                                            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-amber-400 text-xs font-bold text-right" 
                                            placeholder="Meta/Linha" 
                                         />
                                    </div>

                                    <div className="relative w-10 h-10 overflow-hidden rounded-xl border border-slate-800 shrink-0">
                                        <input type="color" value={r.color || '#10b981'} onChange={e => { const n = [...builderRows]; n[i].color = e.target.value; setBuilderRows(n); }} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                                    </div>
                                    <button onClick={() => setBuilderRows(builderRows.filter((_, idx) => idx !== i))} className="p-2 text-slate-700 hover:text-red-500"><X size={18}/></button>
                                </div>
                                ))}
                                <button onClick={() => setBuilderRows([...builderRows, {label: '', barValue: 0, lineValue: 0, color: '#10b981'}])} className="text-[10px] font-black text-emerald-400 mt-2 uppercase flex items-center gap-1"><Plus size={14}/> Adicionar Ponto</button>
                            </div>
                        </div>
                    </div>
                )}
                {formStep === 4 && (
                    <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">4. Resumo Executivo</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">Avanços</label>
                        <textarea value={report.resumoAvanços} onChange={e => setReport({...report, resumoAvanços: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-24" />
                        </div>
                        <div className="space-y-2">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">Atrasos</label>
                        <textarea value={report.resumoAtrasos} onChange={e => setReport({...report, resumoAtrasos: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-24" />
                        </div>
                        <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">Decisões Necessárias</label>
                        <textarea value={report.resumoDecisoes} onChange={e => setReport({...report, resumoDecisoes: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-24" />
                        </div>
                    </div>
                    </div>
                )}
                {formStep === 5 && (
                    <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">5. Informações do Indicador</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                            <tr>
                                <th className="p-4">Indicador</th>
                                <th className="p-4">Resultado</th>
                                <th className="p-4">Meta</th>
                                <th className="p-4">Sinal</th>
                                <th className="p-4">Tendência</th>
                                <th className="p-4">Fonte</th>
                                <th className="p-4"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                            {report.indicadoresChave.map((ind, i) => (
                                <tr key={i} className="hover:bg-slate-800/20">
                                <td className="p-2"><input value={ind.nome} onChange={e => { const n = [...report.indicadoresChave]; n[i].nome = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Nome" /></td>
                                <td className="p-2"><input value={ind.resultado} onChange={e => { const n = [...report.indicadoresChave]; n[i].resultado = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-emerald-400 font-bold outline-none" placeholder="100%" /></td>
                                <td className="p-2"><input value={ind.meta} onChange={e => { const n = [...report.indicadoresChave]; n[i].meta = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="120%" /></td>
                                <td className="p-2">
                                    <select value={ind.status} onChange={e => { const n = [...report.indicadoresChave]; n[i].status = e.target.value as any; setReport({...report, indicadoresChave: n}); }} className="bg-slate-950 text-white rounded p-1 outline-none text-[10px]">
                                    <option value="green">🟢</option>
                                    <option value="yellow">🟡</option>
                                    <option value="red">🔴</option>
                                    </select>
                                </td>
                                <td className="p-2">
                                    <div className="relative">
                                        <select value={ind.tendencia} onChange={e => { const n = [...report.indicadoresChave]; n[i].tendencia = e.target.value as any; setReport({...report, indicadoresChave: n}); }} className="bg-slate-950 text-white rounded p-1 outline-none text-[10px] appearance-none pl-6 pr-2">
                                        <option value="up">Crescimento</option>
                                        <option value="stable">Estável</option>
                                        <option value="down">Queda</option>
                                        </select>
                                        <div className="absolute left-1 top-1.5 pointer-events-none">
                                        {ind.tendencia === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                                        {ind.tendencia === 'down' && <TrendingDown size={12} className="text-red-500" />}
                                        {ind.tendencia === 'stable' && <Minus size={12} className="text-slate-500" />}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2"><input value={ind.fonte} onChange={e => { const n = [...report.indicadoresChave]; n[i].fonte = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-slate-500 outline-none" placeholder="Fonte" /></td>
                                <td className="p-2 text-center"><button onClick={() => setReport({...report, indicadoresChave: report.indicadoresChave.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button onClick={() => setReport({...report, indicadoresChave: [...report.indicadoresChave, {nome: '', meta: '', resultado: '', status: 'green', tendencia: 'stable', fonte: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Nova Linha de Informação</button>
                    </div>
                    </div>
                )}
                {formStep === 6 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">6. Entregas Prioritárias</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Entrega</th>
                             <th className="p-4">Prazo</th>
                             <th className="p-4">Status</th>
                             <th className="p-4">Evidência (Link/Txt)</th>
                             <th className="p-4">Obs.</th>
                             <th className="p-4"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {report.metasPrioritarias.map((m, i) => (
                             <tr key={i}>
                               <td className="p-2"><input value={m.meta} onChange={e => { const n = [...report.metasPrioritarias]; n[i].meta = e.target.value; setReport({...report, metasPrioritarias: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Meta" /></td>
                               <td className="p-2"><input value={m.prazo} onChange={e => { const n = [...report.metasPrioritarias]; n[i].prazo = e.target.value; setReport({...report, metasPrioritarias: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Prazo" /></td>
                               <td className="p-2">
                                 <select value={m.status} onChange={e => { const n = [...report.metasPrioritarias]; n[i].status = e.target.value as any; setReport({...report, metasPrioritarias: n}); }} className="bg-slate-950 text-white rounded p-1 outline-none text-[10px]">
                                   <option value="green">🟢</option>
                                   <option value="yellow">🟡</option>
                                   <option value="red">🔴</option>
                                 </select>
                               </td>
                               <td className="p-2"><input value={m.evidencia} onChange={e => { const n = [...report.metasPrioritarias]; n[i].evidencia = e.target.value; setReport({...report, metasPrioritarias: n}); }} className="w-full bg-transparent p-2 text-blue-400 outline-none" placeholder="Link/SEI" /></td>
                               <td className="p-2"><input value={m.obs} onChange={e => { const n = [...report.metasPrioritarias]; n[i].obs = e.target.value; setReport({...report, metasPrioritarias: n}); }} className="w-full bg-transparent p-2 text-slate-500 outline-none" placeholder="Observação" /></td>
                               <td className="p-2"><button onClick={() => setReport({...report, metasPrioritarias: report.metasPrioritarias.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, metasPrioritarias: [...report.metasPrioritarias, {meta: '', prazo: '', responsavel: '', status: 'green', evidencia: '', obs: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Meta</button>
                    </div>
                  </div>
                )}
                {formStep === 7 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">7. Problemas e Decisões</h3>
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-2">Problemas Críticos</h4>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mb-8">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                            <tr><th className="p-4">Problema</th><th className="p-4">Ação</th><th className="p-4"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                            {report.problemasCriticos.map((p, i) => (
                                <tr key={i}>
                                <td className="p-2"><input value={p.problema} onChange={e => { const n = [...report.problemasCriticos]; n[i].problema = e.target.value; setReport({...report, problemasCriticos: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Problema" /></td>
                                <td className="p-2"><input value={p.acao} onChange={e => { const n = [...report.problemasCriticos]; n[i].acao = e.target.value; setReport({...report, problemasCriticos: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Ação" /></td>
                                <td className="p-2"><button onClick={() => setReport({...report, problemasCriticos: report.problemasCriticos.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button onClick={() => setReport({...report, problemasCriticos: [...report.problemasCriticos, {problema: '', impacto: 'Alto', causa: '', acao: '', prazo: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Problema</button>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-2">Decisões do Prefeito</h4>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                            <tr><th className="p-4">Tema</th><th className="p-4">Decisão</th><th className="p-4"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                            {report.decisoesPrefeito.map((d, i) => (
                                <tr key={i}>
                                <td className="p-2"><input value={d.tema} onChange={e => { const n = [...report.decisoesPrefeito]; n[i].tema = e.target.value; setReport({...report, decisoesPrefeito: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Tema" /></td>
                                <td className="p-2"><input value={d.decisao} onChange={e => { const n = [...report.decisoesPrefeito]; n[i].decisao = e.target.value; setReport({...report, decisoesPrefeito: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Decisão" /></td>
                                <td className="p-2"><button onClick={() => setReport({...report, decisoesPrefeito: report.decisoesPrefeito.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <button onClick={() => setReport({...report, decisoesPrefeito: [...report.decisoesPrefeito, {tema: '', decisao: '', consequencia: '', prazo: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Decisão</button>
                        </div>
                    </div>
                  </div>
                )}
                {formStep === 8 && (
                   <div className="space-y-10">
                      <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">8. Riscos</h3>
                      <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 space-y-8 shadow-2xl">
                         <div className="space-y-4">
                            <div className="flex flex-wrap gap-3">
                               {['Fiscal', 'Jurídico', 'Operacional', 'Político', 'Reputacional'].map(t => (
                                 <button key={t} onClick={() => { const n = report.riscos.tipos.includes(t) ? report.riscos.tipos.filter(x => x !== t) : [...report.riscos.tipos, t]; setReport({...report, riscos: {...report.riscos, tipos: n}}); }} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${report.riscos.tipos.includes(t) ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>{t}</button>
                               ))}
                               {report.riscos.tipos.filter(t => !['Fiscal', 'Jurídico', 'Operacional', 'Político', 'Reputacional'].includes(t)).map(t => (
                                   <button key={t} onClick={() => { const n = report.riscos.tipos.filter(x => x !== t); setReport({...report, riscos: {...report.riscos, tipos: n}}); }} className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase border bg-red-600 border-red-500 text-white flex items-center gap-2">
                                       {t} <X size={12}/>
                                   </button>
                               ))}

                               {!isAddingCustomRisk ? (
                                   <button onClick={() => setIsAddingCustomRisk(true)} className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-2">
                                       Outros +
                                   </button>
                               ) : (
                                   <div className="flex items-center gap-2">
                                       <input 
                                           value={customRiskInput} 
                                           onChange={e => setCustomRiskInput(e.target.value)} 
                                           className="px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-700 text-white outline-none focus:border-emerald-500"
                                           placeholder="Digite o risco..."
                                           autoFocus
                                           onKeyDown={e => e.key === 'Enter' && addCustomRisk()}
                                       />
                                       <button onClick={addCustomRisk} className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"><CheckCircle2 size={16}/></button>
                                       <button onClick={() => setIsAddingCustomRisk(false)} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl"><X size={16}/></button>
                                   </div>
                               )}
                            </div>
                         </div>
                         <textarea value={report.riscos.descricao} onChange={e => setReport({...report, riscos: {...report.riscos, descricao: e.target.value}})} className="w-full p-6 bg-slate-950 border border-slate-800 rounded-3xl text-white text-sm" placeholder="Descreva..." h-40 />
                      </div>
                   </div>
                )}
                {formStep === 9 && (
                   <div className="space-y-8 text-center max-w-xl mx-auto">
                      <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">9. Atualizar Evolução</h3>
                      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 text-left">
                         <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Data</label><input type="date" value={newMoveDate} onChange={e => setNewMoveDate(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold" /></div>
                             <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-2">%</label><input type="number" min="0" max="100" value={newMovePct} onChange={e => setNewMovePct(Number(e.target.value))} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-black text-xl text-center" /></div>
                         </div>
                         <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Feito</label><input value={newMoveDone} onChange={e => setNewMoveDone(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Pendências</label><input value={newMoveMissing} onChange={e => setNewMoveMissing(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" /></div>
                         </div>
                         <button onClick={addProgressMove} disabled={newMovePct === ''} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"><Plus size={18}/> Registrar</button>
                      </div>
                      <div className="space-y-4 text-left">
                        {progressHistory.map((up, i) => (
                            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl flex justify-between items-center group">
                              <div><div className="text-emerald-400 font-black text-xs flex items-center gap-2"><span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{up.percentage}%</span> <span className="text-white">[{new Date(up.date).toLocaleDateString()}]</span></div><p className="text-xs text-slate-300 mt-2">{up.whatWasDone}</p></div>
                              <button onClick={() => setProgressHistory(progressHistory.filter((_, idx) => idx !== i))} className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                            </div>
                        ))}
                      </div>
                   </div>
                )}
              </div>
            ) : (
              // Modo Lista (Catálogo)
              <div className="space-y-6">
                <div className="flex justify-between items-end mb-6 px-4">
                    <div>
                         <h3 className="text-2xl font-black text-white">Catálogo</h3>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{filteredPosts.length} Cadastrados</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select 
                                value={filterTopic} 
                                onChange={e => setFilterTopic(e.target.value)}
                                className="appearance-none bg-slate-900 text-white text-xs font-bold uppercase pl-10 pr-8 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <option value="all">Todas as Áreas</option>
                                {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-t-4 border-l-4 border-r-4 border-transparent border-t-slate-500"></div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {filteredPosts.map((post, index) => (
                    <div 
                        key={post.id} 
                        className={`bg-slate-900/40 p-6 rounded-3xl border flex items-center justify-between group transition-all ${isDragging ? 'opacity-50 border-dashed border-slate-700' : 'border-slate-800 hover:border-emerald-500/30'}`}
                        draggable
                        onDragStart={() => { dragItem.current = index; setIsDragging(true); }}
                        onDragEnter={() => { dragOverItem.current = index; }}
                        onDragEnd={handleSort}
                        onDragOver={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-6">
                         {/* Grip Handle for Dragging */}
                         <div className="p-2 rounded cursor-grab active:cursor-grabbing text-slate-600 hover:text-white">
                             <GripVertical size={20} />
                         </div>

                        <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-all relative">
                          <span className="text-[10px] font-black text-slate-600">{post.topicId.substring(0,3).toUpperCase()}</span>
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${post.semaforoGeral === 'yellow' ? 'bg-amber-500' : post.semaforoGeral === 'red' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-100 text-lg leading-none mb-1">{post.chartConfig.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{post.responsavel} • {new Date(post.dataAtualizacao).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleEditClick(post)} className="p-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all"><Pencil size={18}/></button>
                        <button onClick={() => onDeletePost(post.id)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
