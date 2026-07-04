'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2, X, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiClient, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { CustomerGroup } from '@/types';

type GForm = { name:string; description:string; default_discount_percent:string; earns_loyalty_points:boolean; is_default:boolean; color:string; is_active:boolean; };
const blank = (): GForm => ({name:'',description:'',default_discount_percent:'',earns_loyalty_points:true,is_default:false,color:'#6366f1',is_active:true});

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{open:boolean;g:CustomerGroup|null}>({open:false,g:null});
  const [form, setForm] = useState<GForm>(blank());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups(((await apiClient.get('/store/customer-groups')) as any).data?.groups ?? []); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (g?: CustomerGroup) => {
    setForm(g ? {name:g.name,description:g.description??'',default_discount_percent:g.default_discount_percent!=null?String(g.default_discount_percent):'',earns_loyalty_points:g.earns_loyalty_points,is_default:g.is_default,color:g.color,is_active:g.is_active} : blank());
    setModal({open:true,g:g??null});
  };
  const close = () => setModal({open:false,g:null});
  const upd = (k:keyof GForm, v:any) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required.');
    setSaving(true);
    try {
      const body:any = {name:form.name,description:form.description||undefined,default_discount_percent:form.default_discount_percent?parseFloat(form.default_discount_percent):null,earns_loyalty_points:form.earns_loyalty_points,is_default:form.is_default,color:form.color,is_active:form.is_active,slug:form.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')};
      if (modal.g) { await apiClient.put(`/store/customer-groups/${modal.g.id}`,body); toast.success('Group updated.'); }
      else { await apiClient.post('/store/customer-groups',body); toast.success('Group created.'); }
      close(); load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const del = async (g:CustomerGroup) => {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try { await apiClient.delete(`/store/customer-groups/${g.id}`); toast.success('Deleted.'); load(); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/customers"><ArrowLeft className="h-4 w-4"/></Link></Button>
        <div className="flex-1">
          <h1 className="font-display text-4xl font-bold tracking-tight">Customer Groups</h1>
          <p className="text-muted-foreground mt-1">Segment customers for pricing and marketing</p>
        </div>
        <Button onClick={()=>open()} className="gap-2"><Plus className="h-4 w-4"/>Add Group</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
        : groups.map((g,i) => (
          <motion.div key={g.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
            <Card className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:g.color+'20',color:g.color}}>
                    <Users className="h-4 w-4"/>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.customers_count??0} customers</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>open(g)}><Pencil className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={()=>del(g)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.is_default && <Badge variant="warning" className="text-xs">Default</Badge>}
                {g.default_discount_percent && <Badge variant="outline" className="text-xs">{g.default_discount_percent}% off</Badge>}
                {!g.earns_loyalty_points && <Badge variant="outline" className="text-xs">No loyalty</Badge>}
                <Badge variant={g.is_active?'success':'outline'} className="text-xs">{g.is_active?'Active':'Inactive'}</Badge>
              </div>
              {g.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{g.description}</p>}
            </Card>
          </motion.div>
        ))}
        {!loading && groups.length===0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-40"/><p>No customer groups yet.</p></div>
        )}
      </div>

      <AnimatePresence>{modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close}/>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="relative z-10 w-full max-w-md">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">{modal.g?'Edit Group':'New Group'}</h2>
                <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="e.g. Wholesale" autoFocus/></div>
                <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={e=>upd('description',e.target.value)}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Default Discount %</Label><Input type="number" min="0" max="100" value={form.default_discount_percent} onChange={e=>upd('default_discount_percent',e.target.value)} placeholder="0"/></div>
                  <div className="space-y-1.5"><Label>Color</Label><div className="flex gap-2"><Input type="color" value={form.color} onChange={e=>upd('color',e.target.value)} className="w-10 h-10 p-1 rounded cursor-pointer"/><Input value={form.color} onChange={e=>upd('color',e.target.value)} className="flex-1"/></div></div>
                </div>
                {[['earns_loyalty_points','Earns loyalty points'],['is_default','Default for new customers'],['is_active','Active']].map(([k,l])=>(
                  <div key={k} className="flex items-center justify-between"><Label className="text-sm">{l}</Label><Switch checked={!!form[k as keyof GForm]} onCheckedChange={(v:boolean)=>upd(k as keyof GForm,v)}/></div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
                <Button onClick={save} disabled={saving} className="flex-1 gap-2">{saving&&<Loader2 className="h-4 w-4 animate-spin"/>}Save</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
}
