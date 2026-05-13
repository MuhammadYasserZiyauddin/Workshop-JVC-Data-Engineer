import * as dfd from 'danfojs';

export interface AISuggestion {
  id: string;
  label: string;
  description: string;
  danfoCode: string;
}

export interface PlotlyConfig {
  xColumn?: string;
  yColumn?: string;
  labelColumn?: string;
  valueColumn?: string;
  data?: any[];
  layout: any;
}

export interface VisualizationInsight {
  filterCode: string | null;
  chartType: string;
  plotlyConfig: PlotlyConfig;
  insight: string;
}

export interface NarrativeInsight {
  vibe: string;
  outlier: string;
  action: string;
  isWarning: boolean;
}

export interface DataFrameMetadata {
  columns: string[];
  dtypes: string[];
  nullCounts: Record<string, number>;
  description: string;
  sampleRows: any[];
}

export interface HistoryOperation {
  id: string;
  description: string;
  timestamp: number;
  dfSnapshot: dfd.DataFrame;
}

export interface DataState {
  df: dfd.DataFrame | null;
  viewDf: dfd.DataFrame | null;
  history: HistoryOperation[];
  isLoading: boolean;
  error: string | null;
}
