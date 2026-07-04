'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, UserPlus, Phone, Loader2, WifiOff, CreditCard, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useOfflineCustomers, isStale, staleLabel } from '@/lib/offline/hooks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';

interface Props {
  onSelect: (customer: Customer) => void;
  onClose:  () => void;
}

export default function CustomerModal({ onSelect, onClose }: Props) {
  const user    = useAuthStore(s => s.user);
  const storeId = user?.store?.id;

  const [search,    setSearch]    = useState('');
  const [apiResults, setApiResults] = useState<Customer[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newPhone,  setNewPhone]  = useState('');
  const [creating,  setCreating]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useFocusTrap(modalRef);

  // Offline-first customer search from IndexedDB
  const offlineResults = useOfflineCustomers(storeId, search.trim(), 30);
  const usingOffline   = offlineResults != null; // null means empty cache, undefined means loading

  // Online API search — only when cache is empty
  useEffect(() => {
    if (usingOffline || !search.trim()) { setApiResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get('/store/customers/lookup', { phone: search });
        const data = res.data as any;
        if (data.customer) setApiResults([data.customer]);
        else setApiResults(data.suggestions ?? []);
      } catch { setApiResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, usingOffline]);

  const displayResults: any[] = usingOffline ? (offlineResults ?? []) : apiResults;

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Name is required.');
    if (!isOnline) return toast.error('Creating customers requires internet connection.');
    setCreating(true);
    try {
      const res = await apiClient.post('/store/customers', {
        name:  newName,
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
      <motion.div ref={modalRef} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }} className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by phone, name, or code…" className="pl-9 h-10" />
              {(searching && !usingOffline) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Offline notice */}
          {!isOnline && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
              Offline — showing cached customers only. New customers cannot be created.
            </div>
          )}

          {displayResults.length > 0 && (
            <div className="divide-y max-h-64 overflow-y-auto">
              {displayResults.map((c: any) => {
                const staleData = c.cached_at && isStale(c.cached_at) && !isOnline;
                return (
                  <button key={c.id} onClick={() => onSelect(c as Customer)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm">{c.name}</p>
                        {staleData && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded" title={`Data from ${staleLabel(c.cached_at)}`}>
                            stale
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {c.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.code  && <span className="font-mono">{c.code}</span>}
                        {(c.loyalty_points_balance ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-success">
                            <Gift className="h-3 w-3" />{Number(c.loyalty_points_balance).toFixed(0)} pts
                          </span>
                        )}
                        {(c.outstanding_balance ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-destructive">
                            <CreditCard className="h-3 w-3" />{Number(c.outstanding_balance).toFixed(2)} owed
                          </span>
                        )}
                        {c.credit_limit != null && (
                          <span className="text-muted-foreground">limit: {Number(c.credit_limit).toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {search && displayResults.length === 0 && !searching && (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No customer found for "{search}"
                {usingOffline && ' in offline cache'}
              </p>
              {!isOnline ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  Cannot create customers offline. Connect to internet to add new customers.
                </p>
              ) : !showCreate ? (
                <Button variant="outline" size="sm"
                  onClick={() => { setShowCreate(true); setNewPhone(search); setNewName(''); }}
                  className="gap-2">
                  <UserPlus className="h-4 w-4" />Create New Customer
                </Button>
              ) : (
                <div className="space-y-3 text-left">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" autoFocus />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+92 300 0000000" />
                  </div>
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
              {usingOffline
                ? `Type to search ${(offlineResults?.length ?? 0)} cached customers`
                : 'Type a phone number or name to search'}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
