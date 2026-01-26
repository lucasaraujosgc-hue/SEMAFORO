
import React, { useState } from 'react';
import { Filter, Search, User, Calendar, Target, Activity, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { Post, TopicId } from '../types';
import { TOPICS } from '../constants';
import { Link } from 'react-router-dom';

interface SummaryPanelProps {
  posts: Post[];
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ posts }) => {
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = posts.filter(post => {
    const matchesTopic = filterTopic === 'all' || post.topicId === filterTopic;
    const postStatus = post.semaforoGeral || 'green';
    const matchesStatus = filterStatus === 'all' || postStatus === filterStatus;
    const matchesSearch = (post.indicatorName || post.chartConfig.title).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTopic && matchesStatus && matchesSearch;
  });

  // Agrupar por Secretaria se o filtro for 'all', senão mostra lista direta
  const groupedPosts = filterTopic === 'all' 
    ? TOPICS.map(topic => ({
        topic,
        posts: filteredPosts.filter(p => p.topicId === topic.id)
      })).filter(g => g.posts.length > 0)
    : [{
        topic: TOPICS.find(t => t.id === filterTopic)!,
        posts: filteredPosts
      }];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
      case 'yellow': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      case 'green': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
      default: return 'bg-slate-500';
    }
  };

  const getStatusText = (status: string, rules: any) => {
      if (status === 'red') return rules?.red || 'Crítico';
      if (status === 'yellow') return rules?.yellow || 'Atenção';
      return rules?.green || 'Normal';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header e Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <Link to="/" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-2"><ArrowLeft size={12}/> Voltar ao Início</Link>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <LayoutDashboard className="text-emerald-500"/> Visão Geral Executiva
                </h2>
                <p className="text-sm text-slate-400">Monitoramento consolidado de todas as secretarias.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Buscar indicador..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-slate-900 text-white text-xs py-2 pl-9 pr-4 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 w-48"
                    />
                </div>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800/50">
            <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Filtrar por Secretaria</label>
                <div className="relative">
                    <select 
                        value={filterTopic} 
                        onChange={e => setFilterTopic(e.target.value)}
                        className="w-full appearance-none bg-slate-900 text-white text-xs font-bold uppercase pl-4 pr-10 py-3 rounded-xl border border-slate-700 focus:border-emerald-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                        <option value="all">Todas as Secretarias</option>
                        {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14}/>
                </div>
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Filtrar por Status</label>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                    {[
                        { id: 'all', label: 'Todos', color: 'bg-slate-700' },
                        { id: 'green', label: 'Normal', color: 'bg-emerald-600' },
                        { id: 'yellow', label: 'Atenção', color: 'bg-amber-600' },
                        { id: 'red', label: 'Crítico', color: 'bg-red-600' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setFilterStatus(opt.id)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filterStatus === opt.id ? `${opt.color} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Lista de Indicadores */}
      <div className="space-y-8">
        {groupedPosts.map((group) => (
            <div key={group.topic.id} className="space-y-3">
                {filterTopic === 'all' && (
                    <div className="flex items-center gap-3 px-2">
                        <div className={`w-2 h-2 rounded-full ${group.topic.color}`}></div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{group.topic.label}</h3>
                        <div className="h-px bg-slate-800 flex-1"></div>
                    </div>
                )}
                
                <div className="grid gap-2">
                    {group.posts.map(post => (
                        <div key={post.id} className="relative group perspective-1000">
                            {/* Linha do Indicador */}
                            <div className="bg-slate-900/40 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 rounded-xl flex items-center justify-between transition-all cursor-default group-hover:translate-x-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-600 w-8">{post.progress}%</span>
                                    <span className="text-sm font-medium text-slate-200">{post.indicatorName || post.chartConfig.title}</span>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(post.semaforoGeral || 'green')}`}></div>
                            </div>

                            {/* GRID DETALHADO (TOOLTIP) */}
                            <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-2 w-full md:w-[450px] lg:w-[600px] pointer-events-none group-hover:pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden p-6 relative">
                                    {/* Seta decorativa */}
                                    <div className="absolute -top-2 right-6 w-4 h-4 bg-[#0f172a] border-t border-l border-slate-700 rotate-45"></div>
                                    
                                    <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                                        <div>
                                            <h4 className="text-lg font-black text-white leading-tight mb-1">{post.indicatorName || post.chartConfig.title}</h4>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{post.recorrencia} • {post.responsavel}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${post.semaforoGeral === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-400' : post.semaforoGeral === 'yellow' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                                            {post.semaforoGeral === 'red' ? 'Crítico' : post.semaforoGeral === 'yellow' ? 'Atenção' : 'Normal'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Target size={12}/> Objetivo</span>
                                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{post.report.objetivo || 'Não definido.'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Activity size={12}/> Status Atual</span>
                                            <p className="text-xs text-slate-300 leading-relaxed">{getStatusText(post.semaforoGeral || 'green', post.semaforoRules)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                            <span>Progresso da Meta</span>
                                            <span>{post.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                            <div 
                                                className={`h-full ${post.progress >= 100 ? 'bg-emerald-500' : post.progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                                style={{ width: `${post.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> Atualizado em: {new Date(post.dataAtualizacao).toLocaleDateString()}</span>
                                        <span className="text-emerald-500">Ver Detalhes &rarr;</span>
                                    </div>
                                    
                                    {/* Link invisível para clicar no card inteiro e ir para o detalhe, se desejar */}
                                    <Link to={`/topic/${post.topicId}`} className="absolute inset-0 z-10" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
        {filteredPosts.length === 0 && (
            <div className="text-center py-20 text-slate-500">
                <LayoutDashboard className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-sm font-bold uppercase">Nenhum indicador encontrado com os filtros atuais.</p>
            </div>
        )}
      </div>
    </div>
  );
};
