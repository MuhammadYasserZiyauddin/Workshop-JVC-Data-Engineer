import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import * as dfd from 'danfojs';
import { cn } from '../lib/utils';

interface DropzoneProps {
  onDataLoaded: (df: dfd.DataFrame) => void;
  className?: string;
}

export function Dropzone({ onDataLoaded, className }: DropzoneProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        const df = await dfd.readCSV(file);
        onDataLoaded(df);
      } catch (err) {
        console.error('Error reading CSV:', err);
      }
    }
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer transition-all duration-300",
        "border-2 border-dashed rounded-3xl p-12 text-center bg-white shadow-sm",
        isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          isDragActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-500"
        )}>
          {isDragActive ? <FileText size={32} /> : <Upload size={32} />}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {isDragActive ? "Drop your data here" : "Upload your dataset"}
          </h3>
          <p className="text-gray-500 mt-1">
            Drag and drop your CSV file, or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}
