
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

const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const { type, color: mainColor, barLabel, lineLabel, title, multiLineSeries } = config;

  const { processedData, dataKeys, isComplex, complexConfig, isMultiLine, multiLineSeriesConfig } = useMemo(() => {
    try {
        // CASO ESPECIAL: Múltiplas Linhas (Estrutura Nova)
        if (config.multiLineSeries && Array.isArray(config.multiLineSeries) && config.multiLineSeries.length > 0) {
            // Unifica todos os pontos X de todas as séries para garantir que o eixo X tenha todos os labels
            const allXLabels = Array.from(new Set(
                config.multiLineSeries.flatMap(s => s.data.map(d => d.x))
            ));
            
            // Processa os dados para o formato que o Recharts espera: [{ label: 'Jan', 'Serie1': 10, 'Serie2': 20 }]
            const mergedData = allXLabels.map(label => {
                const row: any = { label };
                config.multiLineSeries!.forEach(s => {
                    const point = s.data.find(d => d.x === label);
                    if (point) {
                        row[s.label] = point.y;
                    }
                });
                return row;
            });

            return {
                processedData: mergedData,
                dataKeys: config.multiLineSeries.map(s => s.label),
                isComplex: false,
                isMultiLine: true,
                multiLineSeriesConfig: config.multiLineSeries
            };
        }

      // CASO 0: Formato Complexo (Legado)
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
      if (config.series && Array.isArray(config.series)) {
        const allLabels = new Set<string>();
        config.series.forEach(s => s.data.forEach(d => allLabels.add(d.label)));
        
        const normalized = Array.from(allLabels).map(label => {
          const item: any = { label };
          config.series?.forEach(s => {
            const point = s.data.find(d => d.label === label);
            if (point) {
              item[s.name] = point.value;
            }
          });
          return item;
        });

        return {
          processedData: normalized,
          dataKeys: config.series.map(s => s.name),
          isComplex: false
        };
      }

      // CASO 3: Formato "Flat" (Simples & Novo AdminPanel - Barras/Pizza)
      if (config.data && Array.isArray(config.data) && config.data.length > 0) {
        const first = config.data[0];
        if (!('values' in first) && !('series' in first)) {
          // Detecta se tem chaves especiais (barValue/lineValue)
          if (first.barValue !== undefined || first.lineValue !== undefined) {
               return { processedData: config.data, dataKeys: ['barValue', 'lineValue'], isComplex: false };
          }

          const keys = Object.keys(first).filter(k => k !== 'label' && k !== 'city' && k !== 'color');
          const normalized = config.data.map((item: any) => ({
            ...item,
            label: item.label || item.city || 'Unknown'
          }));

          return { processedData: normalized, dataKeys: keys, isComplex: false };
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

    // Margens ajustadas para evitar cortes
    const commonMargin = { top: 20, right: 30, bottom: 20, left: 50 };
    const domainWithPadding: [number, any] = [0, (dataMax: number) => Math.ceil(dataMax * 1.05)];

    // 0. Renderização de Múltiplas Linhas (Nova Estrutura)
    if (isMultiLine && multiLineSeriesConfig) {
        return (
            <LineChart data={processedData} margin={commonMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} padding={{ left: 20, right: 20 }} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={domainWithPadding} tickFormatter={formatValue} />
                <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {multiLineSeriesConfig.map((series, index) => (
                    <Line 
                        key={series.label} 
                        type="monotone" 
                        dataKey={series.label} 
                        name={series.label} 
                        stroke={series.color || COLORS[index % COLORS.length]} 
                        strokeWidth={3} 
                        dot={{ r: 4 }} 
                        activeDot={{ r: 6 }} 
                    />
                ))}
            </LineChart>
        );
    }

    // NOVO: Detecta se é o formato misto do novo AdminPanel (com barValue e lineValue) para Barras/Composed
    if (processedData.length > 0 && (processedData[0].barValue !== undefined || processedData[0].lineValue !== undefined)) {
        // Verifica se realmente existe dado de linha para desenhar
        const hasLineData = processedData.some((d: any) => d.lineValue !== undefined && d.lineValue !== null);

        // -- RENDERIZAÇÃO ESPECÍFICA BASEADA NO TIPO --
        
        // 1. PIZZA
        if (type === 'pie') {
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
                  dataKey="barValue" // Usa o valor principal
                  nameKey="label"
                >
                  {processedData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
                <Legend />
              </PieChart>
            );
        }

        // 2. LINHA LEGADA (Caso não use multiLineSeries mas use o builder antigo em modo Line)
        if (type === 'line') {
             return (
                <ComposedChart 
                    data={processedData} 
                    margin={commonMargin}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" scale="point" padding={{ left: 60, right: 60 }} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={domainWithPadding} tickFormatter={formatValue} tickCount={5} interval={0} />
                  <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  
                  <Line 
                    type="monotone"
                    dataKey="barValue" 
                    name={barLabel || "Valor"} 
                    stroke={mainColor || '#10b981'} 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }}
                  />
                  
                  {hasLineData && (
                    <Line type="monotone" dataKey="lineValue" name={lineLabel || "Meta"} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                  )}
                </ComposedChart>
            );
        }

        // 3. BARRA (Default - ComposedChart Misto)
        return (
            <ComposedChart 
                data={processedData} 
                margin={commonMargin}
                barCategoryGap="60%"
                barGap={0}
            >
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="label" 
                scale="point" 
                padding={{ left: 60, right: 60 }} 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                domain={domainWithPadding} 
                tickFormatter={formatValue}
                tickCount={5}
                interval={0}
              />
              <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              
              <Bar 
                dataKey="barValue" 
                name={barLabel || "Valor"} 
                radius={[6, 6, 0, 0]} 
                maxBarSize={90}
              >
                 {processedData.map((entry: any, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.color || '#10b981'} />
                ))}
              </Bar>
              {hasLineData && (
                <Line type="monotone" dataKey="lineValue" name={lineLabel || "Meta"} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              )}
            </ComposedChart>
        );
    }

    if (isComplex && complexConfig && complexConfig.series) {
      return (
        <ComposedChart 
            data={processedData} 
            margin={commonMargin}
            barCategoryGap="45%"
            barGap={0}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" scale="point" padding={{ left: 10, right: 10 }} stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" fontSize={11} tickLine={false} domain={domainWithPadding} label={complexConfig.yAxes?.left?.title ? { value: complexConfig.yAxes.left.title, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 } : undefined} />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} hide={!complexConfig.yAxes?.right} domain={domainWithPadding} label={complexConfig.yAxes?.right?.title ? { value: complexConfig.yAxes.right.title, angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 } : undefined} />
          <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {complexConfig.series.map((serie, index) => {
            if (!serie) return null; 
            const serieColor = serie.color || COLORS[index % COLORS.length];
            const yAxisId = serie.yAxis === 'right' ? 'right' : 'left';
            const dataKey = serie.name || serie.label || `series_${index}`;
            if (serie.type === 'line') {
              return <Line key={dataKey} type="monotone" dataKey={dataKey} name={dataKey} stroke={serieColor} strokeWidth={3} yAxisId={yAxisId} dot={{ r: 4 }} activeDot={{ r: 6 }} />;
            } else {
              return <Bar key={dataKey} dataKey={dataKey} name={dataKey} fill={serieColor} yAxisId={yAxisId} radius={[4, 4, 0, 0]} maxBarSize={60} />;
            }
          })}
        </ComposedChart>
      );
    }

    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData} margin={commonMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={domainWithPadding} tickFormatter={formatValue} />
            <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} name={key === 'value' ? 'Valor' : key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} activeDot={{ r: 6 }} />
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
            <Tooltip formatter={(value: number) => [formatValue(value), '']} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
            <Legend />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart 
            data={processedData} 
            margin={commonMargin}
            barCategoryGap="60%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tickLine={false} 
                domain={domainWithPadding} 
                tickFormatter={formatValue} 
                tickCount={5}
                interval={0}
            />
            <Tooltip formatter={(value: number) => [formatValue(value), '']} cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                name={key === 'value' ? 'Quantidade' : key} 
                fill={dataKeys.length === 1 && mainColor ? mainColor : COLORS[index % COLORS.length]} 
                radius={[6, 6, 0, 0]}
                maxBarSize={90}
               >
                {processedData.map((entry: any, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.color || (dataKeys.length === 1 && mainColor ? mainColor : COLORS[index % COLORS.length])} />
                ))}
              </Bar>
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col relative">
      {/* Título interno exibido de foroma fixa e estilizada como legenda */}
      {title && (
          <div className="w-full text-center pb-2 z-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[#0B1120]/50 px-3 py-1 rounded-full border border-slate-800">
                  {title}
              </span>
          </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
