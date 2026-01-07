import React, { useState } from 'react';
import { X, Trash2, Plus, Lock, TrendingUp, History, ShieldAlert, Target, AlertTriangle, Calendar, FileText, Info, ListChecks, Clock, CheckCircle2, AlertCircle, ClipboardList, Pencil } from 'lucide-react';
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
  secretaria: '', periodo: '', responsavelPolitico: '', 
  pontoFocal: { nome: '', cargo: '', telefone: '', email: '' },
  resumoAvanços: '', resumoAtrasos: '', resumoDecisoes: '',
  indicadoresChave: [], metasPrioritarias: [], problemasCriticos: [], decisoesPrefeito: [],
  riscos: { tipos: [], descricao: '' }, compromissos: [], anexos: ''
};

const INITIAL_SEMAFORO: SemaforoConfig = {
  green: 'Meta atingida conforme planejado.',
  yellow: 'Atraso leve ou atenção necessária para correção de rumo.',
  red: 'Ação crítica necessária. Impacto direto na entrega final.'
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, onClose, posts, onAddPost, onEditPost, onDeletePost
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [formStep, setFormStep] = useState<number>(1);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<TopicId>(TopicId.SAUDE);
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [responsavel, setResponsavel] = useState('');
  const [fonteOficial, setFonteOficial] = useState('');
  const [recorrencia, setRecorrencia] = useState('Mensal');
  const [semaforoRules, setSemaforoRules] = useState<SemaforoConfig>(INITIAL_SEMAFORO);
  const [report, setReport] = useState<ReportSection>(INITIAL_REPORT);
  const [progress, setProgress] = useState(0);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);
  const [builderRows, setBuilderRows] = useState<any[]>([{ label: 'Jan', Valor: 0 }]);

  // State para Nova Movimentação (Step 9)
  const [newMovePct, setNewMovePct] = useState<number | ''>('');
  const [newMoveDone, setNewMoveDone] = useState('');
  const [newMoveMissing, setNewMoveMissing] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'azul') setIsAuthenticated(true);
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
    setReport(post.report || INITIAL_REPORT);
    setProgress(post.progress || 0);
    setProgressHistory(post.progressHistory || []);
    setBuilderRows(Array.isArray(post.chartConfig.data) ? post.chartConfig.data : []);
    setActiveTab('add');
    setFormStep(1);
  };

  const handleSubmit = async () => {
    const config: ChartConfig = { type: 'bar', title, color: selectedColor, data: builderRows };
    const extra = { responsavel, fonteOficial, recorrencia, dataAtualizacao: Date.now(), semaforoRules, progress, progressHistory, report };
    
    let success;
    if (editingPostId) success = await onEditPost(editingPostId, selectedTopic, description, config, extra);
    else success = await onAddPost(selectedTopic, description, config, extra);
    
    if (success !== false) {
      setEditingPostId(null); setTitle(''); setReport(INITIAL_REPORT); setActiveTab('list');
      setBuilderRows([{ label: 'Jan', Valor: 0 }]); setProgress(0); setProgressHistory([]);
    }
  };

  const addProgressMove = () => {
    if (newMovePct === '') return;
    const update: ProgressUpdate = {
      date: Date.now(),
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-12 w-full max-w-sm text-center space-y-8 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20"><Lock className="text-emerald-400" size={32}/></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão Técnica</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Senha" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white text-center font-black outline-none focus:ring-2 focus:ring-emerald-500" autoFocus />
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase hover:bg-emerald-500 transition-all">Acessar</button>
            <button type="button" onClick={onClose} className="text-xs text-slate-500 font-bold uppercase hover:text-white">Sair</button>
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
              <button onClick={() => setActiveTab('add')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'add' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}>{editingPostId ? 'Editar' : 'Lançar Novo'}</button>
              <button onClick={() => setActiveTab('list')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:text-white'}`}>Histórico</button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Navegação de Etapas (Só aparece se estiver em 'add') */}
          {activeTab === 'add' && (
            <div className="w-64 bg-slate-900/30 border-r border-slate-800 p-6 flex flex-col gap-2 overflow-y-auto">
              {[
                { id: 1, label: '1. Identificação', icon: Info },
                { id: 2, label: '2. Resumo Executivo', icon: FileText },
                { id: 3, label: '3. KPIs & Gráficos', icon: TrendingUp },
                { id: 4, label: '4. Metas Prioritárias', icon: Target },
                { id: 5, label: '5. Problemas Críticos', icon: AlertTriangle },
                { id: 6, label: '6. Decisões Prefeito', icon: ListChecks },
                { id: 7, label: '7. Riscos & Alertas', icon: ShieldAlert },
                { id: 8, label: '8. Compromissos', icon: Calendar },
                { id: 9, label: '9. Progresso & Barra', icon: History },
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
                <button onClick={handleSubmit} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all active:scale-95">Finalizar e Publicar</button>
              </div>
            </div>
          )}

          {/* Conteúdo do Formulário */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {activeTab === 'add' ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
                
                {/* Passo 1: Identificação */}
                {formStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">1. Identificação Geral</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Secretaria/Órgão</label>
                         <input value={report.secretaria} onChange={e => setReport({...report, secretaria: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" placeholder="Ex: Secretaria de Saúde" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Período de Referência</label>
                         <input value={report.periodo} onChange={e => setReport({...report, periodo: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" placeholder="Ex: Janeiro/2026" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Responsável Político</label>
                         <input value={report.responsavelPolitico} onChange={e => setReport({...report, responsavelPolitico: e.target.value})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" placeholder="Nome do Secretário" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase">Ponto Focal (Titular)</label>
                         <input value={report.pontoFocal.nome} onChange={e => setReport({...report, pontoFocal: {...report.pontoFocal, nome: e.target.value}})} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" placeholder="Nome do Responsável Técnico" />
                       </div>
                    </div>
                  </div>
                )}

                {/* Passo 2: Resumo Executivo */}
                {formStep === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">2. Resumo Executivo</h3>
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

                {/* Passo 3: KPIs e Gráfico */}
                {formStep === 3 && (
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white">3. Painel de Indicadores-Chave</h3>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Indicador</th>
                             <th className="p-4">Meta</th>
                             <th className="p-4">Resultado</th>
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
                                   <option value="green">🟢 Verde</option>
                                   <option value="yellow">🟡 Amarelo</option>
                                   <option value="red">🔴 Vermelho</option>
                                 </select>
                               </td>
                               <td className="p-2 text-center"><button onClick={() => setReport({...report, indicadoresChave: report.indicadoresChave.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, indicadoresChave: [...report.indicadoresChave, {nome: '', meta: '', resultado: '', status: 'green', tendencia: 'stable', fonte: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Novo Indicador na Tabela</button>
                    </div>

                    <div className="space-y-4 pt-10 border-t border-slate-800">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gráfico Visual de Apoio</h4>
                       <div className="grid md:grid-cols-2 gap-4">
                         <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do Gráfico" className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold" />
                         <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value as TopicId)} className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold">
                            {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                         </select>
                       </div>
                       <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-4">Dados do Eixo X e Valores</label>
                          {builderRows.map((r, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                               <input value={r.label} onChange={e => { const n = [...builderRows]; n[i].label = e.target.value; setBuilderRows(n); }} className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs" />
                               <input type="number" value={r.Valor} onChange={e => { const n = [...builderRows]; n[i].Valor = e.target.value; setBuilderRows(n); }} className="w-32 bg-slate-950 border border-slate-800 p-3 rounded-xl text-emerald-400 text-xs font-bold" />
                               <button onClick={() => setBuilderRows(builderRows.filter((_, idx) => idx !== i))} className="p-2 text-slate-700 hover:text-red-500"><X size={18}/></button>
                            </div>
                          ))}
                          <button onClick={() => setBuilderRows([...builderRows, {label: '', Valor: 0}])} className="text-[10px] font-black text-emerald-400 mt-2 uppercase flex items-center gap-1"><Plus size={14}/> Nova Linha de Dados</button>
                       </div>
                    </div>
                  </div>
                )}

                {/* Passo 4: Metas Prioritárias */}
                {formStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">4. Metas/Entregas Prioritárias</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Meta/Entrega</th>
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
                                   <option value="green">🟢 Verde</option>
                                   <option value="yellow">🟡 Amarelo</option>
                                   <option value="red">🔴 Vermelho</option>
                                 </select>
                               </td>
                               <td className="p-2"><button onClick={() => setReport({...report, metasPrioritarias: report.metasPrioritarias.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, metasPrioritarias: [...report.metasPrioritarias, {meta: '', prazo: '', responsavel: '', status: 'green', evidencia: '', obs: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Nova Meta Prioritária</button>
                    </div>
                  </div>
                )}

                {/* Passo 5: Problemas Críticos */}
                {formStep === 5 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">5. Problemas Críticos</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Problema</th>
                             <th className="p-4">Impacto</th>
                             <th className="p-4">Ação</th>
                             <th className="p-4"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {report.problemasCriticos.map((p, i) => (
                             <tr key={i}>
                               <td className="p-2"><input value={p.problema} onChange={e => { const n = [...report.problemasCriticos]; n[i].problema = e.target.value; setReport({...report, problemasCriticos: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Descrição do problema" /></td>
                               <td className="p-2">
                                 <select value={p.impacto} onChange={e => { const n = [...report.problemasCriticos]; n[i].impacto = e.target.value as any; setReport({...report, problemasCriticos: n}); }} className="bg-slate-950 text-white rounded p-1 outline-none text-[10px]">
                                   <option value="Alto">Alto</option>
                                   <option value="Médio">Médio</option>
                                   <option value="Baixo">Baixo</option>
                                 </select>
                               </td>
                               <td className="p-2"><input value={p.acao} onChange={e => { const n = [...report.problemasCriticos]; n[i].acao = e.target.value; setReport({...report, problemasCriticos: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Ação corretiva" /></td>
                               <td className="p-2"><button onClick={() => setReport({...report, problemasCriticos: report.problemasCriticos.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, problemasCriticos: [...report.problemasCriticos, {problema: '', impacto: 'Alto', causa: '', acao: '', prazo: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Novo Problema Crítico</button>
                    </div>
                  </div>
                )}

                {/* Passo 6: Decisões Prefeito */}
                {formStep === 6 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">6. Decisões do Prefeito</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Tema</th>
                             <th className="p-4">Decisão Necessária</th>
                             <th className="p-4">Prazo</th>
                             <th className="p-4"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {report.decisoesPrefeito.map((d, i) => (
                             <tr key={i}>
                               <td className="p-2"><input value={d.tema} onChange={e => { const n = [...report.decisoesPrefeito]; n[i].tema = e.target.value; setReport({...report, decisoesPrefeito: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Tema" /></td>
                               <td className="p-2"><input value={d.decisao} onChange={e => { const n = [...report.decisoesPrefeito]; n[i].decisao = e.target.value; setReport({...report, decisoesPrefeito: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Qual a decisão?" /></td>
                               <td className="p-2"><input value={d.prazo} onChange={e => { const n = [...report.decisoesPrefeito]; n[i].prazo = e.target.value; setReport({...report, decisoesPrefeito: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Data Limite" /></td>
                               <td className="p-2"><button onClick={() => setReport({...report, decisoesPrefeito: report.decisoesPrefeito.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, decisoesPrefeito: [...report.decisoesPrefeito, {tema: '', decisao: '', consequencia: '', prazo: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Nova Decisão Necessária</button>
                    </div>
                  </div>
                )}

                {/* Passo 7: Riscos */}
                {formStep === 7 && (
                   <div className="space-y-10">
                      <h3 className="text-2xl font-black text-white">7. Riscos e Alertas</h3>
                      <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 space-y-8 shadow-2xl">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Marque os tipos de risco:</label>
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Descrição Objetiva do Risco</label>
                            <textarea value={report.riscos.descricao} onChange={e => setReport({...report, riscos: {...report.riscos, descricao: e.target.value}})} className="w-full p-6 bg-slate-950 border border-slate-800 rounded-3xl text-white text-sm" placeholder="Descreva o risco e a medida de mitigação..." h-40 />
                         </div>
                      </div>
                   </div>
                )}

                {/* Passo 8: Compromissos */}
                {formStep === 8 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white">8. Compromissos Futuros</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <table className="w-full text-xs text-left">
                         <thead className="bg-slate-950 text-slate-500 font-black uppercase">
                           <tr>
                             <th className="p-4">Compromisso</th>
                             <th className="p-4">Prazo</th>
                             <th className="p-4">Responsável</th>
                             <th className="p-4"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                           {report.compromissos.map((c, i) => (
                             <tr key={i}>
                               <td className="p-2"><input value={c.compromisso} onChange={e => { const n = [...report.compromissos]; n[i].compromisso = e.target.value; setReport({...report, compromissos: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Descrição" /></td>
                               <td className="p-2"><input value={c.prazo} onChange={e => { const n = [...report.compromissos]; n[i].prazo = e.target.value; setReport({...report, compromissos: n}); }} className="w-full bg-transparent p-2 text-slate-400 outline-none" placeholder="Data" /></td>
                               <td className="p-2"><input value={c.responsavel} onChange={e => { const n = [...report.compromissos]; n[i].responsavel = e.target.value; setReport({...report, compromissos: n}); }} className="w-full bg-transparent p-2 text-white outline-none" placeholder="Quem?" /></td>
                               <td className="p-2"><button onClick={() => setReport({...report, compromissos: report.compromissos.filter((_, idx) => idx !== i)})} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button></td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <button onClick={() => setReport({...report, compromissos: [...report.compromissos, {compromisso: '', prazo: '', responsavel: '', evidencia: ''}]})} className="w-full p-4 bg-slate-800 text-xs font-black uppercase text-emerald-400 hover:bg-slate-700 transition-all">+ Novo Compromisso</button>
                    </div>
                  </div>
                )}

                {/* Passo 9: Progresso (Novo) */}
                {formStep === 9 && (
                   <div className="space-y-8 text-center max-w-xl mx-auto">
                      <h3 className="text-2xl font-black text-white">Gestão da Barra de Carregamento</h3>
                      
                      {/* Caixa de Entrada da Nova Movimentação */}
                      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-6 text-left">
                         <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Porcentagem de Conclusão (0-100)</label>
                            <div className="flex items-center gap-4">
                               <input type="number" min="0" max="100" value={newMovePct} onChange={e => setNewMovePct(Number(e.target.value))} className="w-32 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-3xl font-black text-emerald-400 text-center outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                               <div className="flex-1 h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${newMovePct || 0}%` }}></div>
                               </div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">O que foi feito nesta etapa?</label>
                               <input value={newMoveDone} onChange={e => setNewMoveDone(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="Ex: Aprovação do projeto básico..." />
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">O que falta para concluir?</label>
                               <input value={newMoveMissing} onChange={e => setNewMoveMissing(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm" placeholder="Ex: Licitação e início da obra..." />
                            </div>
                         </div>
                         <button 
                           onClick={addProgressMove}
                           disabled={newMovePct === ''}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                         >
                           <Plus size={18}/> Adicionar Movimentação
                         </button>
                      </div>

                      {/* Lista Histórico */}
                      <div className="space-y-4 text-left">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Histórico Registrado</h4>
                        {progressHistory.length === 0 ? (
                           <p className="text-center text-slate-600 text-xs italic py-4">Nenhuma movimentação registrada.</p>
                        ) : (
                          progressHistory.map((up, i) => (
                            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl flex justify-between items-center group">
                              <div>
                                <div className="text-emerald-400 font-black text-xs">{up.percentage}% <span className="text-slate-600 ml-2">[{new Date(up.date).toLocaleDateString()}]</span></div>
                                <p className="text-xs text-slate-200 mt-1">{up.whatWasDone}</p>
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
                  <h3 className="text-2xl font-black text-white">Relatórios Publicados</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{posts.length} Indicadores Ativos</p>
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
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{post.responsavel} • {post.recorrencia}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Status Meta</span>
                          <div className="w-32 h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${post.progress}%` }}></div></div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleEditClick(post)} className="p-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all"><Pencil size={18}/></button>
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