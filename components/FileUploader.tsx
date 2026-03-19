import React, { useRef } from 'react';
import { Upload, FileType, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  subLabel?: string;
  accept?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ label, subLabel, accept, file, onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-black text-brand-dark uppercase tracking-widest">{label}</label>
      {subLabel && <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-tighter">{subLabel}</p>}
      
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-200 rounded-[1.5rem] p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary hover:bg-brand-primary/[0.03] transition-all h-36 group"
        >
          <Upload className="w-8 h-8 text-gray-300 mb-2 group-hover:text-brand-primary transition-colors" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-brand-primary">Subir Archivo</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={accept || ".xlsx, .xls, .csv"}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 bg-brand-primary/10 rounded-xl">
                <FileType className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-brand-dark truncate uppercase tracking-tight">{file.name}</span>
                <span className="text-[10px] font-bold text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button 
            onClick={() => onFileSelect(null)}
            className="p-2 hover:bg-brand-secondary/10 rounded-full text-gray-400 hover:text-brand-secondary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;