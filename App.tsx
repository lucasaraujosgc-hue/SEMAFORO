
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Maximize2, X, User, Database, Info, History, TrendingUp, TrendingDown, Minus, Clock, FileText, AlertTriangle, CheckCircle2, Link as LinkIcon, Briefcase, Phone, Mail, ChevronRight, ListChecks, Target, AlertCircle, Calendar, GraduationCap, ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';
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
      const parsedPosts = json.data.map((p: any) => {
         const extra = p.extraData ? JSON.parse(p.extraData) : {};
         return {
           ...p,
           ...extra,
           chartConfig: typeof p.chartConfig === 'string' ? JSON.parse(p.chartConfig) : p.chartConfig
         };
      });

      // Ordenação: Primeiro pelo campo 'order' (crescente), depois por data de criação (decrescente) como fallback
      const sortedPosts = parsedPosts.sort((a: Post, b: Post) => {
          const orderA = a.order !== undefined ? a.order : 99999;
          const orderB = b.order !== undefined ? b.order : 99999;
          
          if (orderA !== orderB) {
              return orderA - orderB;
          }
          return b.createdAt - a.createdAt;
      });

      setPosts(sortedPosts || []);
      setUsingServer(true);
    } catch (err) {
      setUsingServer(false);
      const localData = localStorage.getItem('posts');
      if (localData) {
          const parsedLocal = JSON.parse(localData);
          // Aplica a mesma ordenação para dados locais
          const sortedLocal = parsedLocal.sort((a: Post, b: Post) => {
            const orderA = a.order !== undefined ? a.order : 99999;
            const orderB = b.order !== undefined ? b.order : 99999;
            return orderA - orderB || b.createdAt - a.createdAt;
          });
          setPosts(sortedLocal);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleAddPost = async (topicId: TopicId, description: string, chartConfig: ChartConfig, extraData: any) => {
    // Novos posts vão para o final da lista por padrão (ordem alta)
    const maxOrder = posts.length > 0 ? Math.max(...posts.map(p => p.order || 0)) : 0;
    
    const newPost: Post = {
      id: Date.now().toString(),
      topicId,
      description,
      chartConfig,
      createdAt: Date.now(),
      order: maxOrder + 1,
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
        setPosts(prev => [...prev, newPost].sort((a,b) => (a.order||0)-(b.order||0)));
        return true;
      } catch (err) { return false; }
    } else {
      const updated = [...posts, newPost].sort((a,b) => (a.order||0)-(b.order||0));
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
        // Atualiza e reordena
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updatedFields } : p).sort((a,b) => (a.order||9999)-(b.order||9999)));
        return true;
      } catch (err) { return false; }
    } else {
      const updated = posts.map(p => p.id === postId ? { ...p, ...updatedFields } : p).sort((a,b) => (a.order||9999)-(b.order||9999));
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

// Componente Helper para Semáforo com Tooltip
const SemaforoWithTooltip = ({ status, rules, sizeClass = "w-4 h-4" }: { status: 'green' | 'yellow' | 'red', rules: any, sizeClass?: string }) => {
  const colorClass = status === 'green' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : status === 'yellow' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
  const text = status === 'green' ? rules?.green : status === 'yellow' ? rules?.yellow : rules?.red;

  return (
    <div className="group/tooltip relative flex items-center justify-center cursor-help z-50">
      <div className={`${sizeClass} rounded-full ${colorClass} transition-transform group-hover/tooltip:scale-110`}></div>
      {text && (
        <div className="absolute bottom-full mb-3 hidden group-hover/tooltip:block z-[100] w-64 -left-2">
           <div className="bg-black/90 backdrop-blur-xl text-white text-xs p-3 rounded-xl border border-slate-700 shadow-2xl relative">
              <span className={`block w-2 h-2 rounded-full mb-1 ${status === 'green' ? 'bg-emerald-500' : status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              <p className="font-medium leading-tight">{text}</p>
              <div className="absolute top-full left-4 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
           </div>
        </div>
      )}
    </div>
  );
};

// Novo Componente para Tendência Bonita
const TrendBadge = ({ type }: { type: 'up' | 'down' | 'stable' }) => {
    if (type === 'up') {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-wide">
                <TrendingUp size={14} /> Crescimento
            </div>
        );
    }
    if (type === 'down') {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wide">
                <TrendingDown size={14} /> Queda
            </div>
        );
    }
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 font-bold text-[10px] uppercase tracking-wide">
            <Minus size={14} /> Estável
        </div>
    );
};

const TopicDetailView = ({ posts, isLoading }: { posts: Post[], isLoading: boolean }) => {
  const { topicId } = useParams();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const topic = TOPICS.find(t => t.id === topicId);
  // Posts já estão ordenados pelo fetchPosts
  const topicPosts = posts.filter(p => p.topicId === topicId);

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
        {topicPosts.map(post => {
            const status = post.semaforoGeral || 'green';
            const rules = post.semaforoRules || { green: 'Normal', yellow: 'Atenção', red: 'Crítico' };
            const progressColor = post.progress >= 100 ? 'bg-emerald-500' : post.progress > 50 ? 'bg-blue-500' : 'bg-amber-500';

            return (
          // Removido overflow-hidden e adicionado rounded-t-3xl no header interno para permitir tooltip
          <div key={post.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl hover:border-emerald-500/50 hover:z-20 transition-all flex flex-col h-full group relative">
            
            <div className="p-6 flex items-start justify-between bg-slate-900/80 border-b border-slate-800 relative z-10 rounded-t-3xl">
              <div className="flex items-start gap-5 pr-10 w-full">
                 <div className="mt-1 shrink-0">
                    <SemaforoWithTooltip status={status} rules={rules} sizeClass="w-12 h-12" />
                 </div>
                 
                 <div className="flex-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{post.recorrencia}</span>
                    <h3 className="font-bold text-lg text-slate-100 leading-tight mt-1">{post.chartConfig.title}</h3>
                 </div>
              </div>
              <button onClick={() => setSelectedPost(post)} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-emerald-600 rounded-xl transition-all absolute top-6 right-6"><Maximize2 size={18}/></button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              {/* Gráfico Reduzido, mas com mais altura (h-52) */}
              <div className="h-52 bg-[#0B1120] rounded-2xl p-4 border border-slate-800/80 shadow-inner overflow-hidden relative group-hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] transition-all">
                <ChartRenderer config={post.chartConfig} />
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>Execução da Meta</span>
                  <span className={`${post.progress >= 100 ? 'text-emerald-400' : 'text-slate-200'}`}>{post.progress}%</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 shadow-inner relative">
                  <div className={`h-full ${progressColor} transition-all duration-1000 relative`} style={{ width: `${post.progress}%` }}>
                     <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-50 animate-[pulse_2s_linear_infinite]"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-800 pt-4">
                <span className="flex items-center gap-1.5"><User size={12}/> {post.responsavel}</span>
                <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(post.dataAtualizacao).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )})}
      </div>

      {selectedPost && (
        <ReportModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

const ReportModal = ({ post, onClose }: { post: Post, onClose: () => void }) => {
  const r = post.report || {} as any;
  const semaforoRules = post.semaforoRules || { green: 'Normal', yellow: 'Atenção', red: 'Crítico' };
  
  const history = [...(post.progressHistory || [])].sort((a,b) => b.date - a.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
      <div className="bg-[#0b1120] w-full max-w-6xl rounded-[2.5rem] border border-slate-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-10 duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="p-8 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white p-2 rounded-2xl shrink-0">
               <img src="https://pmsgc-goncalinho.wvai75.easypanel.host/brasao.png" className="w-full h-full object-contain" alt="Brasão" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Indicador Estratégico</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase">{post.recorrencia}</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">{post.chartConfig.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-4 bg-slate-800/50 hover:bg-red-500 text-slate-400 hover:text-white rounded-2xl transition-all shadow-xl"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
          
          <section className="space-y-8">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><TrendingUp className="text-emerald-500" size={24}/> Dados de Evolução e Informações</h3>
            <div className="grid lg:grid-cols-5 gap-8">
               <div className="lg:col-span-2 h-80 bg-slate-950/50 rounded-[2rem] p-8 border border-slate-800/80 shadow-2xl">
                 <ChartRenderer config={post.chartConfig} />
               </div>
               <div className="lg:col-span-3 bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden">
                 <div className="p-5 border-b border-slate-800 bg-slate-950/50">
                    <h5 className="text-sm font-bold text-white uppercase tracking-wider">Informações do Indicador</h5>
                 </div>
                 <table className="w-full text-left text-xs">
                   <thead className="bg-slate-900/80 text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                     <tr>
                       <th className="p-5">Variável</th>
                       <th className="p-5">Resultado</th>
                       <th className="p-5">Meta</th>
                       <th className="p-5 text-center">Sinal</th>
                       <th className="p-5 text-center">Tend.</th>
                       <th className="p-5">Fonte</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/30">
                     {r.indicadoresChave?.length > 0 ? r.indicadoresChave.map((ind: any, i: number) => (
                       <tr key={i} className="hover:bg-slate-800/20 transition-all">
                         <td className="p-5 font-bold text-slate-100">{ind.nome}</td>
                         <td className="p-5 font-bold text-emerald-400">{ind.resultado}</td>
                         <td className="p-5 text-slate-400">{ind.meta}</td>
                         <td className="p-5 text-center">
                              <div className="flex justify-center">
                                <SemaforoWithTooltip status={ind.status} rules={semaforoRules} />
                              </div>
                         </td>
                         <td className="p-5 text-center font-bold text-slate-300">
                            {/* Usando o novo TrendBadge */}
                            <div className="flex justify-center">
                                <TrendBadge type={ind.tendencia} />
                            </div>
                         </td>
                         <td className="p-5 text-slate-500 text-[10px]">{ind.fonte}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={6} className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">Nenhuma informação adicional</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-6">
               <h3 className="text-xl font-black text-white flex items-center gap-2"><Info className="text-emerald-500"/> Definição Estratégica</h3>
               
               <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Objetivo</span>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{r.objetivo || 'Não definido.'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Por que é crítico para o Prefeito?</span>
                    <p className="text-sm text-amber-100/80 leading-relaxed italic">{r.importanciaPrefeito || 'Não definido.'}</p>
                  </div>
                  <div className="flex gap-6 pt-2">
                     <div className="flex-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fórmula</span>
                        <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">{r.formula || 'N/A'}</p>
                     </div>
                     <div className="flex-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fonte</span>
                        <p className="text-xs text-slate-400 font-bold">{post.fonteOficial || 'N/A'}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><AlertCircle className="text-purple-500"/> Calibragem do Semáforo</h3>
                  <div className="space-y-3">
                     <div className="flex items-center gap-3 text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span>{semaforoRules.green}</span>
                     </div>
                     <div className="flex items-center gap-3 text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                        <span>{semaforoRules.yellow}</span>
                     </div>
                     <div className="flex items-center gap-3 text-xs text-slate-300">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        <span>{semaforoRules.red}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><FileText className="text-emerald-500" size={24}/> Resumo Executivo do Período</h3>
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
                 <h5 className="text-[11px] font-black text-blue-400 uppercase mb-3 flex items-center gap-2"><ListChecks size={14}/> Decisões do Prefeito</h5>
                 <p className="text-sm text-slate-300 leading-relaxed italic">"{r.resumoDecisoes || 'Sem demandas de decisão no período.'}"</p>
               </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><History className="text-purple-500" size={24}/> Detalhamento do Progresso</h3>
            <div className="bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                {history.length > 0 ? (
                    <div className="relative border-l border-slate-800 ml-4 space-y-8">
                        {history.map((h, i) => (
                            <div key={i} className="relative pl-8 group">
                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900 group-hover:bg-emerald-500 transition-colors"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">{h.percentage}% Concluído</span>
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{new Date(h.date).toLocaleDateString()}</span>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 space-y-2">
                                    <p className="text-sm text-slate-300"><span className="text-slate-500 font-bold uppercase text-[10px] mr-2">Feito:</span> {h.whatWasDone}</p>
                                    {h.whatIsMissing && <p className="text-sm text-slate-400"><span className="text-slate-500 font-bold uppercase text-[10px] mr-2">Pendente:</span> {h.whatIsMissing}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic text-center py-4">Nenhum histórico de progresso registrado.</p>
                )}
            </div>
          </section>

          {r.metasPrioritarias?.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-3 text-white border-b border-slate-800 pb-4"><Target className="text-emerald-500" size={24}/> Metas Prioritárias</h3>
            <div className="bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden">
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-900/80 text-slate-500 font-black uppercase tracking-widest border-b border-slate-800">
                   <tr>
                     <th className="p-5">Meta / Entrega</th>
                     <th className="p-5">Prazo</th>
                     <th className="p-5 text-center">Status</th>
                     <th className="p-5">Evidência</th>
                     <th className="p-5">Observação</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/30">
                   {r.metasPrioritarias?.map((m: any, i: number) => (
                     <tr key={i} className="hover:bg-slate-800/20 transition-all">
                       <td className="p-5 font-bold text-slate-100">{m.meta}</td>
                       <td className="p-5 text-emerald-400 font-bold">{m.prazo}</td>
                       <td className="p-5 text-center">
                          <div className="flex justify-center">
                             <SemaforoWithTooltip status={m.status} rules={semaforoRules} />
                          </div>
                       </td>
                       <td className="p-5">
                          {m.evidencia ? (
                             <a href={m.evidencia} target="_blank" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold underline"><ExternalLink size={12}/> Ver Doc</a>
                          ) : <span className="text-slate-600">-</span>}
                       </td>
                       <td className="p-5 text-slate-400 italic max-w-xs truncate" title={m.obs}>{m.obs || '-'}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </section>
          )}

          <div className="grid lg:grid-cols-2 gap-12">
             <div className="space-y-6">
                <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><AlertTriangle className="text-amber-500" size={20}/> Problemas e Plano de Ataque</h4>
                <div className="space-y-4">
                   {r.problemasCriticos?.length > 0 ? r.problemasCriticos.map((p: any, i: number) => (
                     <div key={i} className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl space-y-3">
                        <div className="flex justify-between items-start">
                          <h6 className="font-bold text-red-400 text-sm">{p.problema}</h6>
                          <span className="text-[10px] font-black bg-red-500/20 px-2 py-0.5 rounded text-red-300 uppercase">{p.impacto} impacto</span>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/10 text-xs">
                          <span className="text-emerald-400 font-black uppercase text-[9px] block mb-1">Ação Corretiva</span>
                          {p.acao}
                        </div>
                     </div>
                   )) : <p className="text-slate-500 italic text-sm">Nenhum problema crítico reportado.</p>}
                </div>
             </div>

             <div className="space-y-6">
                <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"><ShieldAlert size={20} className="text-red-500"/> Riscos e Alertas</h4>
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
             </div>
          </div>

        </div>
        
        <div className="p-8 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
           <span>Fonte Oficial: {post.fonteOficial}</span>
           <span>SGC - Monitoramento de Resultados v1.3</span>
        </div>
      </div>
    </div>
  );
};

export default App;
