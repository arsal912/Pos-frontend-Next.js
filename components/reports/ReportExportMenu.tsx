'use client';

import { useState } from 'react';
import { Download, Loader2, FileSpreadsheet, FileText, FileCode2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  slug: string;
  filters: Record<string, any>;
  reportName: string;
}

export default function ReportExportMenu({ slug, filters, reportName }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  const doExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setLoading(format);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/backend/store/reports/${slug}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...filters, format }),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      const blob  = await res.blob();
      const ext   = { pdf: 'pdf', excel: 'xlsx', csv: 'csv' }[format];
      const fname = `${reportName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.${ext}`;
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(null); }
  };

  const FORMATS: { key: 'pdf'|'excel'|'csv'; label: string; icon: React.ElementType }[] = [
    { key: 'pdf',   label: 'PDF',   icon: FileText },
    { key: 'excel', label: 'Excel', icon: FileSpreadsheet },
    { key: 'csv',   label: 'CSV',   icon: FileCode2 },
  ];

  return (
    <div className="flex gap-1.5">
      {FORMATS.map(f => (
        <Button key={f.key} variant="outline" size="sm" onClick={() => doExport(f.key)} disabled={loading !== null} className="gap-1.5">
          {loading === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <f.icon className="h-3.5 w-3.5"/>}
          {f.label}
        </Button>
      ))}
    </div>
  );
}
