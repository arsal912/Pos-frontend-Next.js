'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, UserPlus, Phone, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { Customer } from '@/types';

interface Props {
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export default function CustomerModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get('/store/customers/lookup', { phone: search });
        const data = res.data as any;
        if (data.customer) setResults([data.customer]);
        else setResults(data.suggestions ?? []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Name is required.');
    setCreating(true);
    try {
      const res = await apiClient.post('/store/customers', {
        name: newName,
        phone: newPhone || undefined,
      });
      const customer = (res.data as any)?.customer;
      toast.success('Customer created.');
      onSelect(customer);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }} className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by phone, name, or email…" className="pl-9 h-10" />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {results.length > 0 && (
            <div className="divide-y max-h-60 overflow-y-auto">
              {results.map(c => (
                <button key={c.id} onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left transition-colors">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {c.phone && <><Phone className="h-3 w-3" />{c.phone}</>}
                      {c.code && <span className="ml-2 font-mono">{c.code}</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search && results.length === 0 && !searching && (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">No customer found for "{search}"</p>
              {!showCreate ? (
                <Button variant="outline" size="sm" onClick={() => { setShowCreate(true); setNewPhone(search); setNewName(''); }}
                  className="gap-2"><UserPlus className="h-4 w-4" />Create New Customer</Button>
              ) : (
                <div className="space-y-3 text-left">
                  <div className="space-y-1"><Label className="text-xs">Name *</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" autoFocus /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label>
                    <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+92 300 0000000" /></div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={creating} className="flex-1 gap-2">
                      {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create & Select
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!search && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Type a phone number or name to search
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
