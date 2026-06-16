'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight, Loader2, Check, X, Send, PackageCheck,
  Clock, CheckCircle2, XCircle, Ban, Inbox, ArrowUpRight,
  Package, Store, Building2, ChevronDown, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient, getItems, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

type Direction = 'all' | 'out' | 'in';

interface TransferReq {
  id: number;
  requesting_store_id: number;  requesting_store_name: string;
  source_store_id: number;      source_store_name: string;
  source_location_type: string; source_location_name: string;
  product_sku: string;          product_name: string;
  quantity_requested: number;   quantity_fulfilled: number | null;
  status: string;
  request_notes: string | null; response_notes: string | null;
  created_at: string;           actioned_at: string | null;
}

const STATUS_META: Record<string, { label: string; icon: any; variant: string; color: string }> = {
  pending:    { label: 'Pending',    icon: Clock,        variant: 'warning',     color: 'text-yellow-600 dark:text-yellow-400' },
  approved:   { label: 'Approved',   icon: CheckCircle2, variant: 'success',     color: 'text-green-600 dark:text-green-400' },
  in_transit: { label: 'In Transit', icon: Send,         variant: 'secondary',   color: 'text-blue-600 dark:text-blue-400' },
  completed:  { label: 'Completed',  icon: PackageCheck, variant: 'success',     color: 'text-green-700 dark:text-green-300' },
  rejected:   { label: 'Rejected',   icon: XCircle,      variant: 'destructive', color: 'text-destructive' },
  cancelled:  { label: 'Cancelled',  icon: Ban,          variant: 'outline',     color: 'text-muted-foreground' },
};

export default function TransferRequestsPage() {
  const [requests,  setRequests]  = useState<TransferReq[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [direction, setDirection] = useState<Direction>('all');
  const [status,    setStatus]    = useState('');
  const [acting,    setActing]    = useState<number | null>(null);
  const [modal,     setModal]     = useState<{ req: TransferReq; action: string } | null>(null);

  // Counts for tabs
  const incomingPending = requests.filter(r =>
    r.source_store_id === (requests[0]?.source_store_id ?? 0) // will be overridden below
  ).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store/network/requests', {
        direction, status: status || undefined, per_page: 100,
      });
      setRequests(getItems(res));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [direction, status]);

  useEffect(() => { load(); }, [load]);

  // Count badges for tabs
  const outPending = requests.filter(r => r.status === 'pending' && direction !== 'in').length;

  async function doAction(reqId: number, action: string, extra?: Record<string, any>) {
    setActing(reqId);
    try {
      await apiClient.post(`/store/network/requests/${reqId}/${action}`, extra ?? {});
      const labels: Record<string, string> = {
        approve: 'Request approved', reject: 'Request rejected',
        dispatch: 'Marked as in transit', complete: 'Transfer completed',
        cancel: 'Request cancelled',
      };
      toast.success(labels[action] ?? 'Done');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setActing(null); setModal(null); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
          <ArrowLeftRight className="h-8 w-8 text-primary" /> Transfer Requests
        </h1>
        <p className="text-muted-foreground mt-1">
          Track incoming requests from other stores and outgoing requests you have made.
        </p>
      </div>

      {/* Direction tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {([['all', 'All'], ['out', 'Sent by Us'], ['in', 'Incoming']] as [Direction, string][]).map(([d, label]) => (
            <button key={d} onClick={() => setDirection(d)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                direction === d ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {d === 'in' && <Inbox className="h-3 w-3 inline mr-1" />}
              {d === 'out' && <ArrowUpRight className="h-3 w-3 inline mr-1" />}
              {label}
            </button>
          ))}
        </div>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-8 rounded-lg border bg-background text-sm px-2">
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <ArrowLeftRight className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">No transfer requests yet.</p>
          <p className="text-sm text-muted-foreground">Browse the <a href="/dashboard/inventory/network" className="text-primary underline">Network Inventory</a> to request stock from other stores.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const meta     = STATUS_META[req.status] ?? STATUS_META.pending;
            const Icon     = meta.icon;
            const isSource = req.source_store_id !== req.requesting_store_id; // crude detection; real check is via store context
            const acting_  = acting === req.id;

            return (
              <Card key={req.id} className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Status icon */}
                  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-muted', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{req.product_name}</p>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{req.product_sku}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', meta.color,
                        req.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-950' :
                        req.status === 'completed' ? 'bg-green-50 dark:bg-green-950' :
                        req.status === 'rejected' || req.status === 'cancelled' ? 'bg-red-50 dark:bg-red-950' : 'bg-muted'
                      )}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Store className="h-3.5 w-3.5" />{req.requesting_store_name}
                      <ArrowLeftRight className="h-3 w-3" />
                      <Store className="h-3.5 w-3.5" />{req.source_store_name}
                      <span className="text-muted-foreground">·</span>
                      <Building2 className="h-3.5 w-3.5" />{req.source_location_name}
                    </div>

                    {/* Quantities */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span>Requested: <strong>{req.quantity_requested}</strong></span>
                      {req.quantity_fulfilled && (
                        <span className="text-green-600">Fulfilled: <strong>{req.quantity_fulfilled}</strong></span>
                      )}
                      <span className="text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Notes */}
                    {req.request_notes && (
                      <p className="text-xs text-muted-foreground italic">"{req.request_notes}"</p>
                    )}
                    {req.response_notes && (
                      <p className="text-xs text-muted-foreground italic">Response: "{req.response_notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                    {/* Source store actions (incoming) */}
                    {req.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700"
                          disabled={acting_}
                          onClick={() => setModal({ req, action: 'approve' })}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive"
                          disabled={acting_}
                          onClick={() => doAction(req.id, 'reject')}>
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}
                    {req.status === 'approved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-600"
                        disabled={acting_}
                        onClick={() => doAction(req.id, 'dispatch')}>
                        {acting_ ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Mark Dispatched
                      </Button>
                    )}
                    {/* Requesting store actions (outgoing) */}
                    {req.status === 'in_transit' && (
                      <Button size="sm" className="h-7 text-xs gap-1"
                        disabled={acting_}
                        onClick={() => doAction(req.id, 'complete')}>
                        {acting_ ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />} Confirm Receipt
                      </Button>
                    )}
                    {['pending', 'approved'].includes(req.status) && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                        disabled={acting_}
                        onClick={() => doAction(req.id, 'cancel')}>
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve modal (to enter fulfilled qty + notes) */}
      {modal?.action === 'approve' && (
        <ApproveModal
          req={modal.req}
          onClose={() => setModal(null)}
          onApprove={(qty, notes) => doAction(modal.req.id, 'approve', { quantity_fulfilled: qty, response_notes: notes })}
        />
      )}
    </div>
  );
}

// ── Approve Modal ──────────────────────────────────────────────────────────────
function ApproveModal({ req, onClose, onApprove }: {
  req: TransferReq;
  onClose: () => void;
  onApprove: (qty: number, notes: string) => void;
}) {
  const [qty,   setQty]   = useState(String(req.quantity_requested));
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Approve Transfer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="bg-muted/30 rounded-xl p-3 text-sm space-y-1">
          <p className="font-semibold">{req.product_name} <span className="font-mono text-xs text-muted-foreground">{req.product_sku}</span></p>
          <p className="text-xs text-muted-foreground">Requested: <strong className="text-foreground">{req.quantity_requested}</strong> units</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Quantity to fulfil</Label>
          <Input type="number" min="0.001" step="any" value={qty}
            onChange={e => setQty(e.target.value)} className="h-9" />
          {parseFloat(qty) < req.quantity_requested && parseFloat(qty) > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Partial fulfilment — {parseFloat(qty)} of {req.quantity_requested} requested
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Response notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Shipping on Monday" className="h-9" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onApprove(parseFloat(qty), notes)} className="flex-1 gap-2">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </Card>
    </div>
  );
}
