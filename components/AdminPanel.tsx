
import React, { useState } from 'react';
import { X, Trash2, Plus, Lock, TrendingUp, History, ShieldAlert, Target, AlertTriangle, Calendar, FileText, Info, ListChecks, Clock, CheckCircle2, AlertCircle, ClipboardList, Pencil, BookOpen, AlertOctagon, GraduationCap } from 'lucide-react';
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

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, onClose, posts, onAddPost, onEditPost, onDeletePost
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(''); // Feedback de erro
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [formStep, setFormStep] = useState<number>(1);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState(''); // Nome do Indicador
  const [description, setDescription] = useState(''); // Contexto
  const [selectedTopic, setSelectedTopic] = useState<TopicId>(TopicId.EDUCACAO);
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [responsavel, setResponsavel] = useState(''); // Resp. Político (atalho)
  const [fonteOficial, setFonteOficial] = useState('');
  const [recorrencia, setRecorrencia] = useState('Mensal');
  
  const [semaforoRules, setSemaforoRules] = useState<SemaforoConfig>(INITIAL_SEMAFORO);
  const [report, setReport] = useState<ReportSection>(INITIAL_REPORT);
  const [progress, setProgress] = useState(0);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);
  const [builderRows, setBuilderRows] = useState<any[]>([{ label: 'Mês 1', Valor: 0 }]);

  // State para Nova Movimentação (Step 9)
  const [newMoveDate, setNewMoveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMovePct, setNewMovePct] = useState<number | ''>('');
  const [newMoveDone, setNewMoveDone] = useState('');
  const [newMoveMissing, setNewMoveMissing] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    // Normaliza a senha (remove espaços e ignora maiúsculas/minúsculas)
    const normalizedPass = passwordInput.trim().toLowerCase();
    
    if (normalizedPass === 'azul') {
      setIsAuthenticated(true);
    } else {
      setLoginError('Senha incorreta. Tente novamente.');
      // Opcional: vibrar em mobile se suportado
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
    setReport({ ...INITIAL_REPORT, ...post.report }); // Merge para garantir campos novos
    setProgress(post.progress || 0);
    setProgressHistory(post.progressHistory || []);
    setBuilderRows(Array.isArray(post.chartConfig.data) ? post.chartConfig.data : []);
    setActiveTab('add');
    setFormStep(1); // Vai para a definição
  };

  const handleSubmit = async () => {
    const config: ChartConfig = { type: 'bar', title, color: selectedColor, data: builderRows };
    // Mapear responsáveis para o report também
    const finalReport = {
      ...report,
      responsavelPolitico: responsavel, // Sincroniza
    };
    
    const extra = { responsavel, fonteOficial, recorrencia, dataAtualizacao: Date.now(), semaforoRules, progress, progressHistory, report: finalReport };
    
    let success;
    if (editingPostId) success = await onEditPost(editingPostId, selectedTopic, description, config, extra);
    else success = await onAddPost(selectedTopic, description, config, extra);
    
    if (success !== false) {
      setEditingPostId(null); setTitle(''); setReport(INITIAL_REPORT); setActiveTab('list');
      setBuilderRows([{ label: 'Mês 1', Valor: 0 }]); setProgress(0); setProgressHistory([]);
    }
  };

  const addProgressMove = () => {
    if (newMovePct === '') return;
    const dateObj = new Date(newMoveDate);
    // Ajuste de fuso horário simples para manter a data visual selecionada
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

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-12 w-full max-w-sm text-center space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Lock className="text-emerald-400" size={32}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão Técnica</h2>
            <p className="text-slate-500 text-sm mt-2">Área restrita para atualização de indicadores.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setLoginError(''); // Limpa erro ao digitar
                }} 
                placeholder="Senha de Acesso" 
                className={`w-full p-4 bg-slate-950 border ${loginError ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-emerald-500'} rounded-2xl text-white text-center font-black outline-none focus:ring-2 transition-all`} 
                autoFocus 
              />
              {loginError && (
                <p className="text-red-400 text-xs font-bold mt-2 animate-pulse flex items-center justify-center gap-1">
                  <AlertCircle size={12}/> {loginError}
                </p>
              )}
            </div>
            
            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase hover:bg-emerald-500 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
            >
              Acessar Painel
            </button>
            <button type="button" onClick={onClose} className="text-xs text-slate-500 font-bold uppercase hover:text-white transition-colors pt-2">
              Cancelar e Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] w-full max-w-6xl h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Admin */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <ClipboardList className="text-emerald-500" /> Sala de Lançamento
            </h2>
            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl">
              <button onClick={() => setActiveTab('add')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'add' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}>{editingPostId ? 'Editar Indicador' : 'Novo Indicador'}</button>
              <button onClick={() => setActiveTab('list')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}>Catálogo & Atualização</button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Navegação de Etapas */}
          {activeTab === 'add' && (
            <div className="w-64 bg-slate-900/30 border-r border-slate-800 p-6 flex flex-col gap-2 overflow-y-auto hidden md:flex">
              {[
                { id: 1, label: '1. Definição Estratégica', icon: BookOpen },
                { id: 2, label: '2. Regras do Semáforo', icon: AlertOctagon },
                { id: 3, label: '3. Dados & Gráficos', icon: TrendingUp },
                { id: 4, label: '4. Resumo Executivo', icon: FileText },
                { id: 5, label: '5. KPIs Detalhados', icon: ListChecks },
                { id: 6, label: '6. Metas Prioritárias', icon: Target },
                { id: 7, label: '7. Problemas & Decisões', icon: AlertTriangle },
                { id: 8, label: '8. Riscos & Alertas', icon: ShieldAlert },
                { id: 9, label: '9. Evolução & Histórico', icon: History },
              ].map(step => (
                <button 
                  key={step.id} 
                  onClick={() => setFormStep(step.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all group ${formStep === step.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <step.icon size={16} className={formStep === step.id ? 'text-emerald-400' : 'text-slate-600'} />
                  {step.label}
                </button>
              ))}
              <div className="mt-auto pt-6 border-t border-slate-800">
                <button onClick={handleSubmit} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all active:scale-95">Salvar Indicador</button>
              </div>
            </div>
          )}

          {/* Conteúdo do Formulário */}
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            
            {/* Menu Mobile para Etapas */}
            {activeTab === 'add' && (
              <div className="md:hidden mb-6 flex overflow-x-auto gap-2 pb-2">
                 {[1,2,3,4,5,6,7,8,9].map(step => (
                    <button 
                      key={step} 
                      onClick={() => setFormStep(step)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${formStep === step ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Etapa {step}
                    </button>
                 ))}
              </div>
            )}

            {activeTab === 'add' ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
                
                {/* Passo 1: Definição Estratégica (Modelo do Usuário) */}
                {formStep === 1 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">1. Definição Estratégica do Indicador</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Nome do Indicador (Título)</label>
                         <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" placeholder="Ex: MATRÍCULAS CONSOLIDADAS" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Área / Tópico</label>
                         <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value as TopicId)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold">
                            {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Objetivo</label>
                        <textarea value={report.objetivo} onChange={e => setReport({...report, objetivo: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" rows={2} placeholder="Ex: Garantir a correta contabilização das matrículas..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Por que é crítico para o Prefeito?</label>
                        <textarea value={report.importanciaPrefeito} onChange={e => setReport({...report, importanciaPrefeito: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" rows={2} placeholder="Ex: Impacta diretamente o FUNDEB, erro gera perda de receita..." />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Fórmula de Cálculo</label>
                            <input value={report.formula} onChange={e => setReport({...report, formula: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Número total de matrículas consolidadas..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Fonte do Dado</label>
                            <input value={fonteOficial} onChange={e => setFonteOficial(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Sistema Educacenso / INEP" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Periodicidade</label>
                            <input value={recorrencia} onChange={e => setRecorrencia(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Mensal / Semanal" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Resp. Político</label>
                            <input value={responsavel} onChange={e => setResponsavel(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Secretário de Educação" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Resp. Técnico</label>
                            <input value={report.responsavelTecnico} onChange={e => setReport({...report, responsavelTecnico: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Coord. Censo" />
                        </div>
                    </div>
                  </div>
                )}

                {/* Passo 2: Regras do Semáforo (NOVO EDITOR) */}
                {formStep === 2 && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">2. Regras de Calibração do Semáforo</h3>
                        <p className="text-slate-400 text-sm">Defina o texto que aparecerá para cada status deste indicador.</p>

                        <div className="space-y-6">
                            {/* Verde */}
                            <div className="flex gap-4 items-start bg-emerald-950/20 p-6 rounded-2xl border border-emerald-900/50">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Regra para Status Verde</label>
                                    <input value={semaforoRules.green} onChange={e => setSemaforoRules({...semaforoRules, green: e.target.value})} className="w-full p-3 bg-slate-950 border border-emerald-900/50 rounded-xl text-white text-sm" placeholder="Ex: Matrículas consolidadas e validadas." />
                                </div>
                            </div>

                            {/* Amarelo */}
                            <div className="flex gap-4 items-start bg-amber-950/20 p-6 rounded-2xl border border-amber-900/50">
                                <div className="w-8 h-8 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Regra para Status Amarelo</label>
                                    <input value={semaforoRules.yellow} onChange={e => setSemaforoRules({...semaforoRules, yellow: e.target.value})} className="w-full p-3 bg-slate-950 border border-amber-900/50 rounded-xl text-white text-sm" placeholder="Ex: Pendências de validação / risco." />
                                </div>
                            </div>

                            {/* Vermelho */}
                            <div className="flex gap-4 items-start bg-red-950/20 p-6 rounded-2xl border border-red-900/50">
                                <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] shrink-0 mt-1"></div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Regra para Status Vermelho</label>
                                    <input value={semaforoRules.red} onChange={e => setSemaforoRules({...semaforoRules, red: e.target.value})} className="w-full p-3 bg-slate-950 border border-red-900/50 rounded-xl text-white text-sm" placeholder="Ex: Matrículas não lançadas ou rejeitadas." />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800 mt-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2 flex items-center gap-2"><ShieldAlert size={14}/> Ação Automática se Vermelho (Crise)</label>
                                <textarea value={report.acaoCrise} onChange={e => setReport({...report, acaoCrise: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm" placeholder="Ex: Reunião imediata com a UR, Correção em 48h..." />
                            </div>
                        </div>
                    </div>
                )}

                {/* Passo 3: Dados & Gráfico (Antigo 3) */}
                {formStep === 3 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">3. Dados Numéricos do Gráfico</h3>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valores para o Gráfico de Evolução</h4>
                       <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-4">Eixo X (Tempo) e Valores</label>
                          {builderRows.map((r, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                               <input value={r.label} onChange={e => { const n = [...builderRows]; n[i].label = e.target.value; setBuilderRows(n); }} className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs" />
                               <input type="number" value={r.Valor} onChange={e => { const n = [...builderRows]; n[i].Valor = e.target.value; setBuilderRows(n); }} className="w-32 bg-slate-950 border border-slate-800 p-3 rounded-xl text-emerald-400 text-xs font-bold" />
                               <button onClick={() => setBuilderRows(builderRows.filter((_, idx) => idx !== i))} className="p-2 text-slate-700 hover:text-red-500"><X size={18}/></button>
                            </div>
                          ))}
                          <button onClick={() => setBuilderRows([...builderRows, {label: '', Valor: 0}])} className="text-[10px] font-black text-emerald-400 mt-2 uppercase flex items-center gap-1"><Plus size={14}/> Adicionar Ponto no Gráfico</button>
                       </div>
                    </div>
                  </div>
                )}

                {/* Passo 4: Resumo Executivo */}
                {formStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">4. Resumo Executivo Atual</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Plus size={12}/> Principais Avanços</label>
                        <textarea value={report.resumoAvanços} onChange={e => setReport({...report, resumoAvanços: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-32" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Principais Atrasos/Gargalos</label>
                        <textarea value={report.resumoAtrasos} onChange={e => setReport({...report, resumoAtrasos: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-32" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><ListChecks size={12}/> Decisões Necessárias do Prefeito</label>
                        <textarea value={report.resumoDecisoes} onChange={e => setReport({...report, resumoDecisoes: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white h-32" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Passo 5: KPIs (Tabela) */}
                {formStep === 5 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">5. Indicadores Secundários (Tabela)</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Indicador</th>
                             <th className="p-4">Meta</th>
                             <th className="p-4">Result.</th>
                             <th className="p-4">Status</th>
                             <th className="p-4"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {report.indicadoresChave.map((ind, i) => (
                             <tr key={i} className="hover:bg-slate-800/20">
                               <td className="p-2"><input value={ind.nome} onChange={e => { const n = [...report.indicadoresChave]; n[i].nome = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Nome" /></td>
                               <td className="p-2"><input value={ind.meta} onChange={e => { const n = [...report.indicadoresChave]; n[i].meta = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Meta" /></td>
                               <td className="p-2"><input value={ind.resultado} onChange={e => { const n = [...report.indicadoresChave]; n[i].resultado = e.target.value; setReport({...report, indicadoresChave: n}); }} className="w-full bg-transparent p-2 text-emerald-400 font-bold outline-none" placeholder="Result" /></td>
                               <td className="p-2">
                                 <select value={ind.status} onChange={e => { const n = [...report.indicadoresChave]; n[i].status = e.target.value as any; setReport({...report, indicadoresChave: n}); }} className="bg-slate-950 text-white rounded p-1 outline-none text-[10px]">
                                   <option value="green">🟢</option>
                                   <option value="yellow">🟡</option>
                                   <option value="red">🔴</option>
                                 </select>
                               </td>
                               <td className="p-2 text-center"><button onClick={() => setReport({...report, indicadoresChave: report.indicadoresChave.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, indicadoresChave: [...report.indicadoresChave, {nome: '', meta: '', resultado: '', status: 'green', tendencia: 'stable', fonte: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Linha</button>
                    </div>
                  </div>
                )}

                {/* Passo 6: Metas Prioritárias */}
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
                               <td className="p-2"><button onClick={() => setReport({...report, metasPrioritarias: report.metasPrioritarias.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, metasPrioritarias: [...report.metasPrioritarias, {meta: '', prazo: '', responsavel: '', status: 'green', evidencia: '', obs: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Meta</button>
                    </div>
                  </div>
                )}

                {/* Passo 7: Problemas e Decisões */}
                {formStep === 7 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">7. Problemas Críticos & Decisões</h3>
                    
                    <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-2">Problemas Críticos</h4>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mb-8">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                            <tr>
                                <th className="p-4">Problema</th>
                                <th className="p-4">Ação</th>
                                <th className="p-4"></th>
                            </tr>
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
                            <tr>
                                <th className="p-4">Tema</th>
                                <th className="p-4">Decisão</th>
                                <th className="p-4"></th>
                            </tr>
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

                {/* Passo 8: Riscos */}
                {formStep === 8 && (
                   <div className="space-y-10">
                      <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">8. Riscos e Alertas</h3>
                      <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 space-y-8 shadow-2xl">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Tipos de Risco:</label>
                            <div className="flex flex-wrap gap-3">
                               {['Fiscal', 'Jurídico', 'Operacional', 'Político', 'Reputacional', 'Outros'].map(t => (
                                 <button 
                                   key={t}
                                   onClick={() => {
                                      const n = report.riscos.tipos.includes(t) ? report.riscos.tipos.filter(x => x !== t) : [...report.riscos.tipos, t];
                                      setReport({...report, riscos: {...report.riscos, tipos: n}});
                                   }}
                                   className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${report.riscos.tipos.includes(t) ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40' : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-white'}`}
                                 >
                                   {t}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Descrição do Risco</label>
                            <textarea value={report.riscos.descricao} onChange={e => setReport({...report, riscos: {...report.riscos, descricao: e.target.value}})} className="w-full p-6 bg-slate-950 border border-slate-800 rounded-3xl text-white text-sm" placeholder="Descreva..." h-40 />
                         </div>
                      </div>
                   </div>
                )}

                {/* Passo 9: Evolução (Histórico com Data) */}
                {formStep === 9 && (
                   <div className="space-y-8 text-center max-w-xl mx-auto">
                      <h3 className="text-2xl font-black text-white border-b border-slate-800 pb-4">9. Atualizar Evolução do Indicador</h3>
                      
                      {/* Caixa de Entrada da Nova Movimentação */}
                      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 text-left">
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Data da Movimentação</label>
                                <input type="date" value={newMoveDate} onChange={e => setNewMoveDate(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold" />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Conclusão (%)</label>
                                <input type="number" min="0" max="100" value={newMovePct} onChange={e => setNewMovePct(Number(e.target.value))} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-black text-xl text-center" placeholder="0" />
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">O que foi feito?</label>
                               <input value={newMoveDone} onChange={e => setNewMoveDone(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="Ex: Validação dos dados..." />
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Pendências?</label>
                               <input value={newMoveMissing} onChange={e => setNewMoveMissing(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="Ex: Assinatura do termo..." />
                            </div>
                         </div>
                         <button 
                           onClick={addProgressMove}
                           disabled={newMovePct === ''}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                         >
                           <Plus size={18}/> Registrar Movimentação
                         </button>
                      </div>

                      {/* Lista Histórico */}
                      <div className="space-y-4 text-left">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Histórico Completo</h4>
                        {progressHistory.length === 0 ? (
                           <p className="text-center text-slate-600 text-xs italic py-4">Nenhuma movimentação registrada.</p>
                        ) : (
                          progressHistory.map((up, i) => (
                            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl flex justify-between items-center group">
                              <div>
                                <div className="text-emerald-400 font-black text-xs flex items-center gap-2">
                                    <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{up.percentage}%</span> 
                                    <span className="text-slate-500">em</span>
                                    <span className="text-white">[{new Date(up.date).toLocaleDateString()}]</span>
                                </div>
                                <p className="text-xs text-slate-300 mt-2"><span className="text-slate-500 font-bold">Feito:</span> {up.whatWasDone}</p>
                              </div>
                              <button onClick={() => setProgressHistory(progressHistory.filter((_, idx) => idx !== i))} className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                          ))
                        )}
                      </div>
                   </div>
                )}

              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-end mb-6 px-4">
                  <h3 className="text-2xl font-black text-white">Catálogo de Indicadores</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{posts.length} Cadastrados</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {posts.map(post => (
                    <div key={post.id} className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-all">
                          <span className="text-[10px] font-black text-slate-600">{post.topicId.substring(0,3).toUpperCase()}</span>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-100 text-lg leading-none mb-1">{post.chartConfig.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{post.responsavel} • Última Atualização: {new Date(post.dataAtualizacao).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Evolução</span>
                          <div className="w-32 h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${post.progress}%` }}></div></div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleEditClick(post)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-500 transition-all">Atualizar / Editar</button>
                           <button onClick={() => onDeletePost(post.id)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={18}/></button>
                        </div>
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
