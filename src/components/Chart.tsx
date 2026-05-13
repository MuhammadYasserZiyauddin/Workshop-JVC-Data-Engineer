import React from 'react';
import Plotly from 'plotly.js';
import createPlotlyComponent from 'react-plotly.js/factory';
import * as dfd from 'danfojs';
import { Download } from 'lucide-react';
import { VisualizationInsight } from '../types';

const Plot = createPlotlyComponent(Plotly);

interface ChartProps {
  df: dfd.DataFrame;
  title?: string;
  insight?: VisualizationInsight | null;
  onExportConfigChange?: (config: any) => void;
}

export function Chart({ df, title = "Data Visualization", insight, onExportConfigChange }: ChartProps) {
  let plotData: any[] = [];
  let layout: any = {
    autosize: true,
    margin: { t: 10, r: 10, b: 40, l: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif' }
  };
  let displayMeta = "";

  if (insight) {
    const { chartType, plotlyConfig } = insight;
    let x = plotlyConfig.xColumn && df.columns.includes(plotlyConfig.xColumn) ? df[plotlyConfig.xColumn].values : undefined;
    let y = plotlyConfig.yColumn && df.columns.includes(plotlyConfig.yColumn) ? df[plotlyConfig.yColumn].values : undefined;
    let labels = plotlyConfig.labelColumn && df.columns.includes(plotlyConfig.labelColumn) ? df[plotlyConfig.labelColumn].values : undefined;
    let values = plotlyConfig.valueColumn && df.columns.includes(plotlyConfig.valueColumn) ? df[plotlyConfig.valueColumn].values : undefined;

    if (chartType === 'pie') {
      plotData = [{
        labels: labels || x || df[df.columns[0]].values,
        values: values || y || df[df.columns[1] || df.columns[0]].values,
        type: 'pie',
        marker: { colors: ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#0ea5e9'] }
      }];
    } else {
      plotData = [{
        x: x || (labels ? labels : df[df.columns[0]].values),
        y: y || (values ? values : df[df.columns[1] || df.columns[0]].values),
        type: chartType,
        marker: { color: '#6366f1', borderRadius: chartType === 'bar' ? 8 : 0 },
      }];
    }
    
    if (plotlyConfig.layout) {
      layout = { ...layout, ...plotlyConfig.layout };
    }
    displayMeta = insight.insight;
  } else {
    const numericCols = df.columns.filter((col: string) => {
      const dtype = (df[col] as any).dtype;
      return ['int32', 'float32', 'int64', 'float64'].includes(dtype);
    });
    
    const categoricalCols = df.columns.filter((col: string) => {
      const dtype = (df[col] as any).dtype;
      return ['string', 'object', 'boolean', 'datetime'].includes(dtype);
    });

    const xCol = categoricalCols[0] || df.columns[0];
    const yCol = numericCols[0] || df.columns[1] || df.columns[0];

    if (df[xCol] && df[yCol]) {
      plotData = [{
        x: df[xCol].values as any[],
        y: df[yCol].values as any[],
        type: 'bar',
        marker: { color: '#6366f1', borderRadius: 8 },
      }];
      displayMeta = `Showing: ${xCol} vs ${yCol}`;
    }
  }

  React.useEffect(() => {
    if (onExportConfigChange) {
      onExportConfigChange({ data: plotData, layout });
    }
  }, [plotData, layout, onExportConfigChange]);

  const handleExportChart = () => {
    Plotly.downloadImage(document.getElementById('plotly-chart-container') as any, {
      format: 'png',
      width: 1200,
      height: 800,
      filename: 'datavibe_chart'
    });
  };

  return (
    <div className="w-full h-full p-6 flex flex-col bg-white/50 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100/50">
        <div>
          <h3 className="text-xl font-bold text-gray-900 group flex items-center gap-2">
            {title}
          </h3>
          {displayMeta && (
            <p className="text-sm text-indigo-600 font-medium mt-1">{displayMeta}</p>
          )}
        </div>
        <button
          onClick={handleExportChart}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          title="Export Chart as PNG"
        >
          <Download size={18} />
        </button>
      </div>
      <div className="flex-1 w-full min-h-[300px]" id="plotly-chart-container">
        {plotData.length > 0 ? (
          <Plot
            data={plotData}
            layout={layout}
            useResizeHandler={true}
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: true, responsive: true }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No plottable data found
          </div>
        )}
      </div>
    </div>
  );
}
