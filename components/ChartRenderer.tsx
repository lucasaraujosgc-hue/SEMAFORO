
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import { ChartConfig, ExternalChartData } from '../types';

interface ChartRendererProps {
  config: ChartConfig;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const formatNumberPTBR = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, notation: value > 1000000 ? 'compact' : 'standard' }).format(value);
};

const formatCurrencyTooltip = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const { type } = config;

  const { processedData, dataKeys, isComplex, complexConfig, seriesConfig } = useMemo(() => {
    try {
      // NOVA LÓGICA: Suporte explícito a "series" (Composed Chart do AdminPanel)
      if (config.series && Array.isArray(config.series)) {
           return {
               processedData: config.data || [],
               dataKeys: config.series.map(s => s.dataKey),
               isComplex: false,
               seriesConfig: config.series
           }
      }

      // LÓGICA LEGADA (Para manter compatibilidade com dados antigos/json manual)
      // CASO 0: Formato Complexo
      if (config.data && !Array.isArray(config.data) && typeof config.data === 'object') {
        const extData = config.data as any; 
        
        if ('labels' in extData || 'series' in extData) {
          const labels = Array.isArray(extData.labels) ? extData.labels : [];
          const series = Array.isArray(extData.series) ? extData.series : [];
          
          const normalized = labels.map((label: string, index: number) => {
            const item: any = { label };
            series.forEach((s: any, sIndex: number) => {
              if (!s) return;
              const key = s.name || s.label || `series_${sIndex}`;
              const val = (Array.isArray(s.data) && s.data[index] !== undefined) ? s.data[index] : null;
              item[key] = val;
            });
            return item;
          });

          const keys = series
            .filter((s: any) => s)
            .map((s: any) => s.name || s.label || 'unknown');

          return {
            processedData: normalized,
            dataKeys: keys,
            isComplex: true,
            complexConfig: extData as ExternalChartData
          };
        }
      }

      // CASO 1: Formato "Nested Values"
      if (config.data && Array.isArray(config.data) && config.data.length > 0) {
        const firstItem = config.data[0];
        if (firstItem && 'values' in firstItem && Array.isArray(firstItem.values)) {
          const seriesList = config.data as any[];
          const uniqueLabels = new Set<string>();

          seriesList.forEach(series => {
            if (Array.isArray(series.values)) {
              series.values.forEach((v: any) => {
                const xAxisLabel = v.city || v.label;
                if (xAxisLabel) uniqueLabels.add(xAxisLabel);
              });
            }
          });

          const normalized = Array.from(uniqueLabels).map(xAxisLabel => {
            const row: any = { label: xAxisLabel };
            seriesList.forEach(series => {
              const seriesName = series.label || series.name || 'Unnamed';
              const point = series.values?.find((v: any) => (v.city || v.label) === xAxisLabel);
              if (point) {
                row[seriesName] = point.value;
              }
            });
            return row;
          });

          const keys = seriesList.map(s => s.label || s.name || 'Unknown');

          return { processedData: normalized, dataKeys: keys, isComplex: false };
        }
      }

      // CASO 2: Formato "Series" (Antigo)
      if (config.series && Array.isArray(config.series) && !config.series[0].dataKey) { // Check if it's not the NEW series format
        const allLabels = new Set<string>();
        config.series.forEach((s:any) => s.data.forEach((d:any) => allLabels.add(d.label)));
        
        const normalized = Array.from(allLabels).map(label => {
          const item: any = { label };
          config.series?.forEach((s:any) => {
            const point = s.data.find((d:any) => d.label === label);
            if (point) {
              item[s.name] = point.value;
            }
          });
          return item;
        });

        return {
          processedData: normalized,
          dataKeys: config.series.map((s:any) => s.name),
          isComplex: false
        };
      }

      // CASO 3: Formato "Flat" (Simples/Legado do AdminPanel antigo)
      if (config.data && Array.isArray(config.data) && config.data.length > 0) {
        const first = config.data[0];
        // Se tem 'label' e 'Valor' (formato antigo padrão)
        if (first.label !== undefined) {
             // Detecta chaves numéricas
             const keys = Object.keys(first).filter(k => k !== 'label' && k !== 'city' && k !== 'color' && typeof first[k] === 'number');
             
             // Se não achou chaves numéricas mas tem 'Valor' (caso do builder antigo)
             if (keys.length === 0 && first['Valor'] !== undefined) keys.push('Valor');

             return { processedData: config.data, dataKeys: keys, isComplex: false };
        }
      }

      return { processedData: [], dataKeys: [], isComplex: false };

    } catch (e) {
      console.error("Erro ao processar dados do gráfico:", e);
      return { processedData: [], dataKeys: [], isComplex: false };
    }
  }, [config]);

  const renderChart = () => {
    if (!processedData || processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Sem dados para exibir
        </div>
      );
    }

    const commonMargin = { top: 40, right: 20, bottom: 5, left: 10 };
    const domainWithPadding: [number, any] = [0, (dataMax: number) => Math.ceil(dataMax * 1.1)];

    // RENDERIZADOR PRINCIPAL (Composed/Misto)
    if (seriesConfig || type === 'composed' || (isComplex && complexConfig)) {
        // Se vier do novo AdminPanel (seriesConfig) ou JSON complexo
        const seriesToRender = seriesConfig || (complexConfig?.series ? complexConfig.series.map((s, i) => ({
            dataKey: s.name || s.label || `series_${i}`,
            name: s.name || s.label,
            color: s.color,
            type: s.type || 'bar',
            yAxisId: s.yAxis === 'right' ? 'right' : 'left'
        })) : dataKeys.map(k => ({ dataKey: k, name: k, type: 'bar', color: '#10b981', yAxisId: 'left' })));

        return (
            <ComposedChart data={processedData} margin={commonMargin}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" scale="point" padding={{ left: 20, right: 20 }} stroke="#94a3b8" fontSize={11} tickLine={false} />
              
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                domain={domainWithPadding}
                tickFormatter={formatNumberPTBR} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                domain={domainWithPadding} 
                hide={!seriesToRender.some((s:any) => s.yAxisId === 'right')}
                tickFormatter={formatNumberPTBR}
              />
              
              <Tooltip 
                formatter={(value: number) => [formatCurrencyTooltip(value), '']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} 
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              
              {seriesToRender.map((serie: any, index: number) => {
                const color = serie.color || COLORS[index % COLORS.length];
                if (serie.type === 'line') {
                  return <Line key={serie.dataKey} type="monotone" dataKey={serie.dataKey} name={serie.name} stroke={color} strokeWidth={3} yAxisId={serie.yAxisId || 'left'} dot={{ r: 4 }} activeDot={{ r: 6 }} />;
                } else {
                  return <Bar key={serie.dataKey} dataKey={serie.dataKey} name={serie.name} fill={color} yAxisId={serie.yAxisId || 'left'} radius={[4, 4, 0, 0]} barSize={40} />;
                }
              })}
            </ComposedChart>
        );
    }

    // Fallback para tipos simples (Pie/Line puro sem config avançada)
    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={domainWithPadding} tickFormatter={formatNumberPTBR} />
            <Tooltip formatter={(value: number) => [formatCurrencyTooltip(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} name={key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        );
      case 'pie':
        const pieDataKey = dataKeys[0] || 'value';
        return (
          <PieChart>
             <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                return percent > 0.05 ? (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              }}
              outerRadius={80}
              dataKey={pieDataKey}
              nameKey="label"
            >
              {processedData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [formatCurrencyTooltip(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
            <Legend />
          </PieChart>
        );
      default:
        // Bar Chart simples fallback
        return (
          <BarChart data={processedData} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={domainWithPadding} tickFormatter={formatNumberPTBR} />
            <Tooltip formatter={(value: number) => [formatCurrencyTooltip(value), '']} cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Bar key={key} dataKey={key} name={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]}>
                 {processedData.map((entry: any, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
