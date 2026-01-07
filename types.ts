
export enum TopicId {
  SAUDE = 'saude',
  EDUCACAO = 'educacao',
  DESENVOLVIMENTO_SOCIAL = 'social',
  FINANCAS = 'financas',
  ESPORTE_CULTURA_LAZER = 'esporte',
  AGRICULTURA = 'agricultura',
  INFRAESTRUTURA = 'infraestrutura',
  PLANEJAMENTO = 'planejamento',
}

export interface ProgressUpdate {
  date: number;
  percentage: number;
  whatWasDone: string;
  whatIsMissing: string;
}

export interface SemaforoConfig {
  green: string;
  yellow: string;
  red: string;
}

export interface ReportSection {
  // 1. Identificação
  secretaria: string;
  periodo: string;
  responsavelPolitico: string;
  pontoFocal: {
    nome: string;
    cargo: string;
    telefone: string;
    email: string;
  };

  // 2. Resumo Executivo
  resumoAvanços: string;
  resumoAtrasos: string;
  resumoDecisoes: string;

  // 3. Indicadores-Chave (Tabela)
  indicadoresChave: Array<{
    nome: string;
    meta: string;
    resultado: string;
    status: 'green' | 'yellow' | 'red';
    tendencia: 'up' | 'stable' | 'down';
    fonte: string;
  }>;

  // 4. Metas Prioritárias
  metasPrioritarias: Array<{
    meta: string;
    prazo: string;
    responsavel: string;
    status: 'green' | 'yellow' | 'red';
    evidencia: string;
    obs: string;
  }>;

  // 5. Problemas Críticos
  problemasCriticos: Array<{
    problema: string;
    impacto: 'Alto' | 'Médio' | 'Baixo';
    causa: string;
    acao: string;
    prazo: string;
  }>;

  // 6. Decisões Prefeito
  decisoesPrefeito: Array<{
    tema: string;
    decisao: string;
    consequencia: string;
    prazo: string;
  }>;

  // 7. Riscos e Alertas
  riscos: {
    tipos: string[]; // Fiscal, Jurídico, Operacional, Político, Reputacional, Outros
    descricao: string;
  };

  // 8. Compromissos Próximo Período
  compromissos: Array<{
    compromisso: string;
    prazo: string;
    responsavel: string;
    evidencia: string;
  }>;

  // 9. Anexos
  anexos: string;
}

export interface ExternalChartData {
  labels: string[];
  series: Array<{
    name?: string;
    label?: string;
    data: any[];
    type?: 'bar' | 'line';
    color?: string;
    yAxis?: 'left' | 'right';
  }>;
  yAxes?: {
    left?: { title?: string };
    right?: { title?: string };
  };
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data?: any;
  series?: any[];
  color?: string;
  options?: any;
}

export interface Post {
  id: string;
  topicId: TopicId;
  description: string;
  chartConfig: ChartConfig;
  createdAt: number;
  responsavel: string;
  fonteOficial: string;
  recorrencia: string;
  dataAtualizacao: number;
  semaforoRules: SemaforoConfig;
  progress: number;
  progressHistory: ProgressUpdate[];
  report: ReportSection;
}

export interface TopicDef {
  id: TopicId;
  label: string;
  iconName: string;
  color: string;
  description: string;
}
