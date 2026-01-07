
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

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const { type, color: mainColor } = config;

  const { processedData, dataKeys, isComplex, complexConfig } = useMemo(() => {
    try {
      // CASO 0: Formato Complexo (ExternalChartData com labels e series separados)
      // Ex: { labels: ["A", "B"], series: [{ label: "S1", data: [1,2] }] }
      if (config.data && !Array.isArray(config.data) && typeof config.data === 'object') {
        const extData = config.data as any; // Cast para any para verificação segura
        
        if ('labels' in extData || 'series' in extData) {
          const labels = Array.isArray(extData.labels) ? extData.labels : [];
          const series = Array.isArray(extData.series) ? extData.series : [];
          
          // "Costura" os dados: cria um array de objetos onde cada objeto tem a label e os valores das series
          const normalized = labels.map((label: string, index: number) => {
            const item: any = { label };
            series.forEach((s: any, sIndex: number) => {
              if (!s) return;
              // Usa o índice para pegar o dado correspondente
              // Suporta s.name OU s.label como chave
              const key = s.name || s.label || `series_${sIndex}`;
              
              // Verificação de segurança para array de dados
              const val = (Array.isArray(s.data) && s.data[index] !== undefined) ? s.data[index] : null;
              item[key] = val;
            });
            return item;
          });

          const keys = series
            .filter((s: any) => s) // Filtra séries nulas
            .map((s: any) => s.name || s.label || 'unknown');

          return {
            processedData: normalized,
            dataKeys: keys,
            isComplex: true,
            complexConfig: extData as ExternalChartData
          };
        }
      }

      // CASO 1: Formato "Nested Values" (Novo Formato do Usuário com 'city')
      // Ex: [{ label: "Pobreza", values: [{ city: "SGC", value: 10 }] }]
      if (config.data && Array.isArray(config.data) && config.data.length > 0) {
        // Verifica se o primeiro item tem a propriedade 'values' que é um array
        const firstItem = config.data[0];
        if (firstItem && 'values' in firstItem && Array.isArray(firstItem.values)) {
          const seriesList = config.data as any[];
          const uniqueLabels = new Set<string>();

          // Coleta todas as labels do eixo X (pode ser 'city' ou 'label')
          seriesList.forEach(series => {
            if (Array.isArray(series.values)) {
              series.values.forEach((v: any) => {
                const xAxisLabel = v.city || v.label;
                if (xAxisLabel) uniqueLabels.add(xAxisLabel);
              });
            }
          });

          // Pivota os dados para o formato Flat do Recharts
          // [{label: "SGC", "Pobreza": 10, "Renda": 5}]
          const normalized = Array.from(uniqueLabels).map(xAxisLabel => {
            const row: any = { label: xAxisLabel };
            
            seriesList.forEach(series => {
              const seriesName = series.label || series.name || 'Unnamed';
              // Encontra o valor correspondente para esta cidade nesta série
              const point = series.values?.find((v: any) => (v.city || v.label) === xAxisLabel);
              if (point) {
                row[seriesName] = point.value;
              }
            });
            
            return row;
          });

          const keys = seriesList.map(s => s.label || s.name || 'Unknown');

          return {
            processedData: normalized,
            dataKeys: keys,
            isComplex: false // Convertemos para flat, então usa renderização padrão
          };
        }
      }

      // CASO 2: Formato "Series" (Antigo / Legado)
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

      // CASO 3: Formato "Flat" (Simples) - data: [{label: 'A', val: 10}]
      if (config.data && Array.isArray(config.data) && config.data.length > 0) {
        // Verifica se é realmente flat (não aninhado)
        const first = config.data[0];
        if (!('values' in first) && !('series' in first)) {
           // Descobre as chaves dinamicamente
          const keys = Object.keys(first).filter(k => k !== 'label' && k !== 'city' && k !== 'color');
          
          // Se usar 'city' em vez de 'label' no root object
          const normalized = config.data.map((item: any) => ({
            ...item,
            label: item.label || item.city || 'Unknown'
          }));

          return {
            processedData: normalized,
            dataKeys: keys,
            isComplex: false
          };
        }
      }

      return { processedData: [], dataKeys: [], isComplex: false };

    } catch (e) {
      console.error("Erro ao processar dados do gráfico:", e);
      return { processedData: [], dataKeys: [], isComplex: false };
    }
  }, [config]);

  const renderChart = () => {
    // Proteção contra dados vazios
    if (!processedData || processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          Sem dados para exibir
        </div>
      );
    }

    // Se for o formato complexo, usamos ComposedChart para permitir mistura de barras e linhas
    if (isComplex && complexConfig && complexConfig.series) {
      return (
        <ComposedChart data={processedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="label" 
            scale="point" 
            padding={{ left: 10, right: 10 }} 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
          />
          
          {/* Eixo Y Esquerdo (Padrão) */}
          <YAxis 
            yAxisId="left"
            orientation="left"
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false}
            label={complexConfig.yAxes?.left?.title ? { value: complexConfig.yAxes.left.title, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 } : undefined}
          />
          
          {/* Eixo Y Direito (Opcional) */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false}
            hide={!complexConfig.yAxes?.right} // Esconde se não tiver config
            label={complexConfig.yAxes?.right?.title ? { value: complexConfig.yAxes.right.title, angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 } : undefined}
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              borderRadius: '8px', 
              border: '1px solid #334155', 
              color: '#f8fafc' 
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />

          {complexConfig.series.map((serie, index) => {
            if (!serie) return null; // Skip invalid series
            
            const serieColor = serie.color || COLORS[index % COLORS.length];
            const yAxisId = serie.yAxis === 'right' ? 'right' : 'left';
            const dataKey = serie.name || serie.label || `series_${index}`;
            
            if (serie.type === 'line') {
              return (
                <Line
                  key={dataKey}
                  type="monotone"
                  dataKey={dataKey}
                  name={dataKey}
                  stroke={serieColor}
                  strokeWidth={3}
                  yAxisId={yAxisId}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            } else {
              return (
                <Bar
                  key={dataKey}
                  dataKey={dataKey}
                  name={dataKey}
                  fill={serieColor}
                  yAxisId={yAxisId}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              );
            }
          })}
        </ComposedChart>
      );
    }

    // Renderização Padrão para formatos simples e convertidos
    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                name={key === 'value' ? 'Valor' : key}
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={3}
                activeDot={{ r: 6 }} 
              />
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
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || COLORS[index % COLORS.length]} // Usa cor individual se existir
                  stroke="rgba(0,0,0,0.2)" 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                color: '#f8fafc' 
              }}
            />
            <Legend />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={processedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              cursor={{ fill: '#334155', opacity: 0.4 }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                color: '#f8fafc' 
              }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                name={key === 'value' ? 'Quantidade' : key} 
                fill={dataKeys.length === 1 && mainColor ? mainColor : COLORS[index % COLORS.length]} 
                radius={[4, 4, 0, 0]} 
              >
                {/* Mapeamento de células para cores individuais */}
                {processedData.map((entry: any, i: number) => (
                  <Cell 
                    key={`cell-${i}`} 
                    fill={entry.color || (dataKeys.length === 1 && mainColor ? mainColor : COLORS[index % COLORS.length])} 
                  />
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
