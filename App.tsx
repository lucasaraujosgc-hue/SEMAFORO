
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Maximize2, X, User, Database, Info, History, TrendingUp, TrendingDown, Minus, Clock, FileText, AlertTriangle, CheckCircle2, Link as LinkIcon, Briefcase, Phone, Mail, ChevronRight, ListChecks, Target, AlertCircle, Calendar } from 'lucide-react';
import { TOPICS } from './constants';
import { Post, TopicId, ChartConfig, ProgressUpdate } from './types';
import { TopicCard } from './components/TopicCard';
import { ChartRenderer } from './components/ChartRenderer';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usingServer, setUsingServer] = useState(true);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('Erro servidor');
      const json = await response.json();
      // O backend retorna 'extraData' serializado. Precisamos combinar com os campos base.
      const parsedPosts = json.data.map((p: any) => {
         // O 'extraData' contém responsavel, report, progress, etc.
         // Se 'extraData' existir, fazemos o merge.
         const extra = p.extraData ? JSON.parse(p.extraData) : {};
         return {
           ...p,
           ...extra,
           chartConfig: typeof p.chartConfig === 'string' ? JSON.parse(p.chartConfig) : p.chartConfig
         };
      });
      setPosts(parsedPosts || []);
      setUsingServer(true);
    } catch (err) {
      setUsingServer(false);
      const localData = localStorage.getItem('posts');
      if (localData) setPosts(JSON.parse(localData));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleAddPost = async (topicId: TopicId, description: string, chartConfig: ChartConfig, extraData: any) => {
    const newPost: Post = {
      id: Date.now().toString(),
      topicId,
      description,
      chartConfig,
      createdAt: Date.now(),
      ...extraData
    };

    if (usingServer) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPost),
        });
        if (!response.ok) throw new Error('Erro salvar');
        setPosts(prev => [newPost, ...prev]);
        return true;
      } catch (err) { return false; }
    } else {
      const updated = [newPost, ...posts];
      setPosts(updated);
      localStorage.setItem('posts', JSON.stringify(updated));
      return true;
    }
  };

  const handleEditPost = async (postId: string, topicId: TopicId, description: string, chartConfig: ChartConfig, extraData: any) => {
    const updatedFields = { topicId, description, chartConfig, ...extraData };
    if (usingServer) {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields),
        });
        if (!response.ok) throw new Error('Erro update');
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updatedFields } : p));
        return true;
      } catch (err) { return false; }
    } else {
      const updated = posts.map(p => p.id === postId ? { ...p, ...updatedFields } : p);
      setPosts(updated);
      localStorage.setItem('posts', JSON.stringify(updated));
      return true;
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (usingServer) {
      await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      const updated = posts.filter(p => p.id !== postId);
      setPosts(updated);
      localStorage.setItem('posts', JSON.stringify(updated));
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#020617] text-slate-100 font-sans">
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4">
              <img src="https://pmsgc-goncalinho.wvai75.easypanel.host/brasao.png" className="h-10 w-auto" alt="Logo" />
              <div>
                <h1 className="text-xl font-bold text-white leading-none">Gestão de Indicadores</h1>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Sala de Situação Executiva</span>
              </div>
            </Link>
            <button onClick={() => setIsAdminOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 border border-slate-700 rounded-lg transition-all active:scale-95">
              <Lock size={14} /> Gestão
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<DashboardView isLoading={isLoading} />} />
            <Route path="/topic/:topicId" element={<TopicDetailView posts={posts} isLoading={isLoading} />} />
          </Routes>
        </main>

        {isAdminOpen && (
          <AdminPanel 
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            posts={posts}
            onAddPost={handleAddPost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            usingServer={usingServer}
          />
        )}
      </div>
    </Router>
  );
}

const DashboardView = ({ isLoading }: { isLoading: boolean }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-10 py-10">
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2">Painel de Monitoramento</h2>
        <p className="text-slate-400 max-w-xl mx-auto">Acompanhamento transparente das metas e resultados da gestão municipal.</p>
      </div>
      {isLoading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOPICS.map(topic => <TopicCard key={topic.id} topic={topic} onClick={(id) => navigate(`/topic/${id}`)} />)}
        </div>
      )}
    </div>
  );
};

const TopicDetailView = ({ posts, isLoading }: { posts: Post[], isLoading: boolean }) => {
  const { topicId } = useParams();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const topic = TOPICS.find(t => t.id === topicId);
  const topicPosts = posts.filter(p => p.topicId === topicId).sort((a, b) => b.createdAt - a.createdAt);

  if (!topic) return <div className="text-center py-20">Não encontrado</div>;

  return (
    <div>
      <div className="mb-10 flex items-end justify-between border-b border-slate-800 pb-6">
        <div>
          <Link to="/" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-2"><ArrowLeft size={12}/> Voltar ao Início</Link>
          <h2 className="text-3xl font-bold">{topic.label}</h2>
          <p className="text-slate-400 mt-1">{topic.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {topicPosts.map(post => (
          <div key={post.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col h-full group">
            <div className="p-6 flex justify-between items-start bg-slate-900/80 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{post.recorrencia}</span>
                <h3 className="font-bold text-lg text-slate-100">{post.chartConfig.title}</h3>
              </div>
              <button onClick={() => setSelectedPost(post)} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-emerald-600 rounded-xl transition-all"><Maximize2 size={18}/></button>
            </div>
            <div className="p-6 flex-1 space-y-5">
              <div className="h-56 bg-slate-950/80 rounded-2xl p-4 border border-slate-800/50 shadow-inner">
                <ChartRenderer config={post.chartConfig} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  <span>Progresso da Meta</span>
                  <span className="text-emerald-400">{post.progress}%</span>
                </div>
                <div className="h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" style={{ width: `${post.progress}%` }}></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-800 pt-4">
                <span className="flex items-center gap-1.5"><User size={12}/> {post.responsavel}</span>
                <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(post.dataAtualizacao).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPost && (
        <ReportModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

const ReportModal = ({ post, onClose }: { post: Post, onClose: () => void }) => {
  const r = post.report || {} as any;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
      <div className="bg-[#0b1120] w-full max-w-6xl rounded-[2.5rem] border border-slate-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-10 duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header Relatório */}
        <div className="p-8 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white p-2 rounded-2xl shrink-0">
               <img src="https://pmsgc-goncalinho.wvai75.easypanel.host/brasao.png" className="w-full h-full object-contain" alt="Brasão" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Relatório Executivo v1.0</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase">{post.recorrencia}</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">{post.chartConfig.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-4 bg-slate-800/50 hover:bg-red-500 text-slate-400 hover:text-white rounded-2xl transition-all shadow-xl"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-16 custom-scrollbar">
          
          {/* 1. Identificação */}
          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><Info className="text-emerald-500" size={24}/> 1. Identificação Geral</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Secretaria/Órgão</span>
                <p className="text-sm font-bold text-slate-200">{r.secretaria || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Período Referência</span>
                <p className="text-sm font-bold text-slate-200">{r.periodo || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/30 p-5 rounded-3xl border border-slate-800/50">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Responsável Político</span>
                <p className="text-sm font-bold text-slate-200">{r.responsavelPolitico || 'N/A'}</p>
              </div>
              <div className="bg-emerald-500/5 p-5 rounded-3xl border border-emerald-500/20">
                <span className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Ponto Focal (Titular)</span>
                <p className="text-sm font-bold text-slate-100">{r.pontoFocal?.nome || 'N/A'}</p>
                <div className="flex gap-2 mt-2">
                  {r.pontoFocal?.telefone && <Phone size={12} className="text-slate-500"/>}
                  {r.pontoFocal?.email && <Mail size={12} className="text-slate-500"/>}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Resumo Executivo */}
          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><FileText className="text-emerald-500" size={24}/> 2. Resumo Executivo</h3>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="bg-emerald-500/5 border-l-4 border-emerald-500 p-6 rounded-r-3xl">
                 <h5 className="text-[11px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2"><CheckCircle2 size={14}/> Principais Avanços</h5>
                 <p className="text-sm text-slate-300 leading-relaxed italic">"{r.resumoAvanços || 'Sem avanços relatados no período.'}"</p>
               </div>
               <div className="bg-amber-500/5 border-l-4 border-amber-500 p-6 rounded-r-3xl">
                 <h5 className="text-[11px] font-black text-amber-400 uppercase mb-3 flex items-center gap-2"><Clock size={14}/> Principais Atrasos</h5>
                 <p className="text-sm text-slate-300 leading-relaxed italic">"{r.resumoAtrasos || 'Sem gargalos relatados no período.'}"</p>
               </div>
               <div className="bg-blue-500/5 border-l-4 border-blue-500 p-6 rounded-r-3xl">
                 <h5 className="text-[11px] font-black text-blue-400 uppercase mb-3 flex items-center gap-2"><AlertCircle size={14}/> Decisões do Prefeito</h5>
                 <p className="text-sm text-slate-300 leading-relaxed italic">"{r.resumoDecisoes || 'Sem demandas de decisão no período.'}"</p>
               </div>
            </div>
          </section>

          {/* 3. Painel de Indicadores */}
          <section className="space-y-8">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><TrendingUp className="text-emerald-500" size={24}/> 3. Painel de Indicadores-Chave</h3>
            <div className="grid lg:grid-cols-5 gap-8">
               <div className="lg:col-span-2 h-80 bg-slate-950/50 rounded-[2rem] p-8 border border-slate-800/80 shadow-2xl">
                 <ChartRenderer config={post.chartConfig} />
               </div>
               <div className="lg:col-span-3 bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden">
                 <table className="w-full text-left text-xs">
                   <thead className="bg-slate-900/80 text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                     <tr>
                       <th className="p-5">Indicador</th>
                       <th className="p-5">Meta (Tri/Ano)</th>
                       <th className="p-5 text-center">Status</th>
                       <th className="p-5 text-right">Resultado</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/30">
                     {r.indicadoresChave?.length > 0 ? r.indicadoresChave.map((ind: any, i: number) => (
                       <tr key={i} className="hover:bg-slate-800/20 transition-all">
                         <td className="p-5">
                            <div className="font-bold text-slate-100">{ind.nome}</div>
                            <div className="text-[10px] text-slate-500">Fonte: {ind.fonte}</div>
                         </td>
                         <td className="p-5 text-slate-400 font-medium">{ind.meta}</td>
                         <td className="p-5">
                            <div className="flex justify-center">
                              <div className={`w-4 h-4 rounded-full ${ind.status === 'green' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ind.status === 'yellow' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}></div>
                            </div>
                         </td>
                         <td className="p-5 text-right font-mono font-bold text-emerald-400">
                            <div className="flex items-center justify-end gap-2">
                               {ind.tendencia === 'up' ? <TrendingUp size={14}/> : ind.tendencia === 'down' ? <TrendingDown size={14} className="text-red-400"/> : <Minus size={14} className="text-slate-500"/>}
                               {ind.resultado}
                            </div>
                         </td>
                       </tr>
                     )) : (
                       <tr><td colSpan={4} className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">Nenhum indicador listado</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </section>

          {/* 4. Metas Prioritárias */}
          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><Target className="text-emerald-500" size={24}/> 4. Metas Prioritárias do Período</h3>
            <div className="bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden">
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-800">
                   <tr>
                     <th className="p-5">Meta / Entrega</th>
                     <th className="p-5">Prazo / Resp.</th>
                     <th className="p-5 text-center">Status</th>
                     <th className="p-5">Evidência</th>
                     <th className="p-5">Observação</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/30">
                   {r.metasPrioritarias?.map((m: any, i: number) => (
                     <tr key={i} className="hover:bg-slate-800/20 transition-all">
                       <td className="p-5 font-bold text-slate-100">{m.meta}</td>
                       <td className="p-5">
                          <div className="text-emerald-400 font-bold">{m.prazo}</div>
                          <div className="text-[10px] text-slate-500">{m.responsavel}</div>
                       </td>
                       <td className="p-5 text-center">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${m.status === 'green' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : m.status === 'yellow' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>{m.status}</span>
                       </td>
                       <td className="p-5">
                          <a href={m.evidencia} target="_blank" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold underline"><LinkIcon size={12}/> Documento</a>
                       </td>
                       <td className="p-5 text-slate-400 italic">"{m.obs}"</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </section>

          {/* 5 e 6: Problemas e Decisões */}
          <div className="grid lg:grid-cols-2 gap-12">
             <div className="space-y-6">
                <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><AlertTriangle className="text-amber-500" size={20}/> 5. Problemas e Plano de Ataque</h4>
                <div className="space-y-4">
                   {r.problemasCriticos?.length > 0 ? r.problemasCriticos.map((p: any, i: number) => (
                     <div key={i} className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl space-y-3">
                        <div className="flex justify-between items-start">
                          <h6 className="font-bold text-red-400 text-sm">{p.problema}</h6>
                          <span className="text-[10px] font-black bg-red-500/20 px-2 py-0.5 rounded text-red-300 uppercase">{p.impacto} impacto</span>
                        </div>
                        <p className="text-xs text-slate-400"><span className="text-slate-200 font-bold">Causa:</span> {p.causa || 'Não informada'}</p>
                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/10 text-xs">
                          <span className="text-emerald-400 font-black uppercase text-[9px] block mb-1">Ação Corretiva</span>
                          {p.acao} <span className="text-slate-500 font-bold ml-2">[{p.prazo}]</span>
                        </div>
                     </div>
                   )) : <p className="text-slate-500 italic text-sm">Nenhum problema crítico reportado.</p>}
                </div>
             </div>
             
             <div className="space-y-6">
                <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><ListChecks className="text-blue-400" size={20}/> 6. Decisões do Prefeito</h4>
                <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 space-y-4">
                   {r.decisoesPrefeito?.length > 0 ? r.decisoesPrefeito.map((d: any, i: number) => (
                     <div key={i} className="border-b border-slate-800 last:border-0 pb-4 last:pb-0">
                        <h6 className="text-sm font-bold text-slate-200 mb-1">{d.tema}</h6>
                        <p className="text-xs text-blue-300 mb-2 italic">"{d.decisao}"</p>
                        <div className="flex justify-between text-[10px] text-slate-500">
                           <span>Prazo: {d.prazo}</span>
                           <span className="text-red-400">Risco: {d.consequencia || 'N/A'}</span>
                        </div>
                     </div>
                   )) : <p className="text-slate-500 italic text-sm">Sem demandas de decisão no período.</p>}
                </div>
             </div>
          </div>
          
          {/* 7: Riscos */}
          <section className="space-y-6">
             <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><ShieldAlert size={20} className="text-red-500"/> 7. Riscos e Alertas</h4>
             <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-6">
                <div className="flex flex-wrap gap-2">
                   {['Fiscal', 'Jurídico', 'Operacional', 'Político', 'Reputacional'].map(t => (
                     <div key={t} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${r.riscos?.tipos?.includes(t) ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-slate-800 text-slate-600 border-slate-700 opacity-40'}`}>{t}</div>
                   ))}
                </div>
                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800/80 italic text-slate-300 text-sm leading-relaxed">
                  "{r.riscos?.descricao || 'Nenhum risco crítico identificado para o período.'}"
                </div>
             </div>
          </section>

          {/* 8: Compromissos Futuros */}
          <section className="space-y-6">
             <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><Calendar size={20} className="text-purple-400"/> 8. Compromissos para o Próximo Período</h4>
             <div className="bg-slate-900/30 rounded-[2rem] border border-slate-800/50 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                    <tr><th className="p-5">Compromisso</th><th className="p-5">Responsável</th><th className="p-5 text-right">Prazo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {r.compromissos?.length > 0 ? r.compromissos.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/20">
                         <td className="p-5 font-bold text-slate-200">{c.compromisso}</td>
                         <td className="p-5 text-slate-400">{c.responsavel}</td>
                         <td className="p-5 text-right text-emerald-400 font-mono">{c.prazo}</td>
                      </tr>
                    )) : <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">Nenhum compromisso agendado.</td></tr>}
                  </tbody>
                </table>
             </div>
          </section>

          {/* 9. Anexos e Rodapé */}
          <section className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="space-y-2">
                <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">9. Anexos e Documentação Complementar</h5>
                <p className="text-sm text-slate-300 font-bold italic">"{r.anexos || 'Sem anexos para este indicador.'}"</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase">Validação da Sala de Situação</p>
                <div className="mt-2 flex items-center gap-2 justify-end text-emerald-400">
                  <CheckCircle2 size={16}/>
                  <span className="text-xs font-bold uppercase">Informação Auditada</span>
                </div>
             </div>
          </section>

        </div>
        
        <div className="p-8 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
           <span>Fonte Oficial: {post.fonteOficial}</span>
           <span>SGC - Monitoramento de Resultados v1.0.3</span>
        </div>
      </div>
    </div>
  );
};

const ShieldAlert = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>
  </svg>
);

export default App;
