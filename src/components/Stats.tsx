import * as dfd from 'danfojs';
import { Columns, Rows, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatsProps {
  df: dfd.DataFrame;
}

export function Stats({ df }: StatsProps) {
  const rowCount = df.shape[0] || 0;
  const colCount = df.shape[1] || 0;
  
  let nullCount = 0;
  try {
    const naSum = df.isNa().sum() as any;
    if (naSum && naSum.values) {
      nullCount = naSum.values.reduce((a: any, b: any) => (a as number) + (b as number), 0) as number;
    }
  } catch (e) {
  }

  const statItems = [
    { label: 'Rows', value: rowCount.toLocaleString(), icon: Rows, color: 'text-blue-600', bg: 'bg-blue-50/50' },
    { label: 'Columns', value: colCount, icon: Columns, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
    { label: 'Missing Values', value: nullCount, icon: AlertCircle, color: nullCount > 0 ? 'text-amber-600' : 'text-emerald-600', bg: nullCount > 0 ? 'bg-amber-50/50' : 'bg-emerald-50/50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statItems.map((item, idx) => (
        <div key={idx} className="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", item.bg)}>
            <item.icon className={item.color} size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">{item.label}</p>
            <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
