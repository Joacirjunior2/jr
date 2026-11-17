import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { errorMessage, formatDate, statuses, type Delivery, type DeliveryStatus, type Driver } from '@/lib/delivery';
import { Button, Field, Notice, Select } from '@/components/ui/controls';
import { DriverForm } from '@/components/DriverForm';
import { DeliveryForm } from '@/components/DeliveryForm';
import { DeliverySummary } from '@/components/DeliverySummary';

type Editor = { kind: 'driver'; record: Driver | null } | { kind: 'delivery'; record: Delivery | null } | null;
const pageSize = 20;

export function AdminDashboard({ session }: { session: Session }) {
  const [tab, setTab] = useState<'deliveries' | 'drivers'>('deliveries');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(true);
  const [error, setError] = useState('');
  const [driversError, setDriversError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [summaryRevision, setSummaryRevision] = useState(0);
  const request = useRef(0);
  const driverRequest = useRef(0);
  const statusLock = useRef(false);

  const loadDrivers = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const id = ++driverRequest.current;
    setDriversLoading(true); setDriversError('');
    try {
      const all: Driver[] = [];
      let offset = 0;
      while (true) {
        const { data, error: readError } = await client.from('entregadores').select('id,nome,telefone,tipo_veiculo').order('nome').order('id').range(offset, offset + 499);
        if (readError) throw readError;
        if (id !== driverRequest.current) return;
        all.push(...(data as Driver[]));
        if (data.length < 500) break;
        offset += 500;
      }
      if (id === driverRequest.current) setDrivers(all);
    } catch (cause) {
      if (id === driverRequest.current) { setDrivers([]); setDriversError(errorMessage(cause)); }
    } finally { if (id === driverRequest.current) setDriversLoading(false); }
  }, []);

  const loadDeliveries = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const id = ++request.current;
    setLoading(true); setError('');
    try {
      let query = client.from('entregas').select('id,origem_site,referencia_pedido,endereco_coleta,endereco_destino,entregador_id,status,criado_em,atualizado_em').order('criado_em', { ascending: false }).order('id');
      if (statusFilter) query = query.eq('status', statusFilter);
      if (driverFilter === 'unassigned') query = query.is('entregador_id', null);
      else if (driverFilter) query = query.eq('entregador_id', driverFilter);
      const { data, error: readError } = await query.range(page * pageSize, page * pageSize + pageSize);
      if (readError) throw readError;
      if (id !== request.current) return;
      setDeliveries((data as Delivery[]).slice(0, pageSize));
      setHasNext(data.length > pageSize);
    } catch (cause) {
      if (id === request.current) { setDeliveries([]); setHasNext(false); setError(errorMessage(cause)); }
    } finally { if (id === request.current) setLoading(false); }
  }, [statusFilter, driverFilter, page]);

  useEffect(() => { void loadDrivers(); return () => { driverRequest.current++; }; }, [loadDrivers]);
  useEffect(() => { void loadDeliveries(); return () => { request.current++; }; }, [loadDeliveries]);

  function refresh() {
    setActionError('');
    setSummaryRevision((value) => value + 1);
    void loadDrivers(); void loadDeliveries();
  }

  function saved() {
    const kind = editor?.kind;
    setEditor(null);
    if (kind === 'delivery') setSummaryRevision((value) => value + 1);
    setNotice(kind === 'driver' ? 'Entregador salvo com sucesso.' : 'Entrega salva com sucesso. A lista respeita os filtros selecionados.');
    void loadDrivers();
    if (page !== 0) setPage(0); else void loadDeliveries();
  }

  async function changeStatus(delivery: Delivery, next: DeliveryStatus) {
    if (!supabase || next === delivery.status || statusLock.current) return;
    statusLock.current = true;
    setSavingStatus(delivery.id); setActionError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('entregas').update({ status: next }).eq('id', delivery.id).select('id').single();
      if (updateError) throw updateError;
      setNotice('Status atualizado com sucesso.');
      setSummaryRevision((value) => value + 1);
      await loadDeliveries();
    } catch (cause) { setActionError(errorMessage(cause)); }
    finally { statusLock.current = false; setSavingStatus(null); }
  }

  async function logout() {
    if (!supabase) return;
    setLoggingOut(true); setActionError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (cause) { setActionError(errorMessage(cause)); }
    finally { setLoggingOut(false); }
  }

  function openEditor(next: Exclude<Editor, null>) {
    setNotice(''); setActionError(''); setEditor(next);
  }

  const driverNames = new Map(drivers.map((driver) => [driver.id, driver.nome]));
  const locked = editor !== null || savingStatus !== null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">CE</span><div><p className="font-bold tracking-tight">Central de Entregas</p><p className="text-xs text-muted-foreground">Operação & gestão</p></div></div>
          <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-primary">EQUIPE DE GESTÃO</p><p className="max-w-64 truncate text-sm text-muted-foreground">{session.user.email}</p></div><Button variant="secondary" disabled={loggingOut || locked} onClick={logout}>{loggingOut ? 'Saindo…' : 'Sair'}</Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Painel administrativo</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sua operação, organizada.</h1><p className="mt-3 text-sm text-muted-foreground sm:text-base">Gerencie entregadores e acompanhe cada etapa das entregas.</p></div>
          <Button variant="secondary" onClick={refresh} disabled={loading || driversLoading || locked}>Atualizar dados</Button>
        </div>
        <DeliverySummary revision={summaryRevision} />
        <nav aria-label="Seções do painel" className="flex w-fit gap-1 rounded-2xl border border-border bg-card p-1.5">
          <Button variant={tab === 'deliveries' ? 'primary' : 'secondary'} aria-pressed={tab === 'deliveries'} disabled={locked} onClick={() => { setTab('deliveries'); setNotice(''); }}>Entregas</Button>
          <Button variant={tab === 'drivers' ? 'primary' : 'secondary'} aria-pressed={tab === 'drivers'} disabled={locked} onClick={() => { setTab('drivers'); setNotice(''); }}>Entregadores</Button>
        </nav>
        {notice && <Notice>{notice}</Notice>}
        {actionError && <Notice error>{actionError}</Notice>}
        {driversError && <Notice error>Não foi possível carregar os entregadores: {driversError} Use Atualizar dados para tentar novamente.</Notice>}
        <div className={`grid items-start gap-6 ${editor ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : ''}`}>
          {editor && <div className="order-first lg:order-last lg:sticky lg:top-6">
            {editor.kind === 'driver' ? <DriverForm key={editor.record?.id ?? 'new-driver'} driver={editor.record} onCancel={() => setEditor(null)} onSaved={saved} /> : <DeliveryForm key={editor.record?.id ?? 'new-delivery'} delivery={editor.record} drivers={drivers} onCancel={() => setEditor(null)} onSaved={saved} />}
          </div>}
          <section className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">{tab === 'deliveries' ? 'Entregas' : 'Entregadores'}</h2><p className="mt-1 text-sm text-muted-foreground">{tab === 'deliveries' ? 'Pedidos mais recentes primeiro' : driversLoading ? 'Carregando equipe…' : `${drivers.length} entregador(es) cadastrado(s)`}</p></div>
              <Button disabled={locked || driversLoading || !!driversError} onClick={() => openEditor(tab === 'deliveries' ? { kind: 'delivery', record: null } : { kind: 'driver', record: null })}>{tab === 'deliveries' ? '+ Nova entrega' : '+ Novo entregador'}</Button>
            </div>
            {tab === 'deliveries' ? <>
              <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Status"><Select disabled={locked} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}><option value="">Todos os status</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</Select></Field>
                <Field label="Entregador"><Select disabled={locked || driversLoading || !!driversError} value={driverFilter} onChange={(event) => { setDriverFilter(event.target.value); setPage(0); }}><option value="">Todos os entregadores</option><option value="unassigned">Sem entregador</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nome} · {driver.id.slice(0, 8)}</option>)}</Select></Field>
                <Button variant="secondary" disabled={locked || (!statusFilter && !driverFilter)} onClick={() => { setStatusFilter(''); setDriverFilter(''); setPage(0); }}>Limpar</Button>
              </div>
              {loading ? <Loading text="Carregando entregas…" /> : error ? <Notice error>Não foi possível carregar as entregas: {error} Use Atualizar dados para tentar novamente.</Notice> : deliveries.length === 0 ? <Empty title="Nenhuma entrega encontrada" description={statusFilter || driverFilter ? 'Altere os filtros para consultar outros pedidos.' : 'Cadastre uma entrega para começar a acompanhar sua operação.'} /> : <div className="space-y-4">
                {deliveries.map((delivery) => {
                  const status = statuses.find((item) => item.value === delivery.status);
                  return <article key={delivery.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xs font-medium uppercase tracking-wide text-muted-foreground">{delivery.origem_site}</p><h3 className="mt-1 break-words text-lg font-bold">{delivery.referencia_pedido}</h3></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status?.color ?? 'bg-muted text-foreground'}`}>{status?.label ?? delivery.status}</span></div>
                    <dl className="my-5 grid gap-4 text-sm sm:grid-cols-2"><div className="min-w-0 border-l-2 border-primary pl-3"><dt className="mb-1 text-xs font-semibold text-muted-foreground">COLETA</dt><dd className="whitespace-pre-wrap break-words">{delivery.endereco_coleta}</dd></div><div className="min-w-0 border-l-2 border-border pl-3"><dt className="mb-1 text-xs font-semibold text-muted-foreground">DESTINO</dt><dd className="whitespace-pre-wrap break-words">{delivery.endereco_destino}</dd></div></dl>
                    <div className="space-y-1 text-sm"><p className="break-words"><span className="text-muted-foreground">Entregador: </span>{delivery.entregador_id ? driverNames.get(delivery.entregador_id) ?? (driversLoading ? 'Carregando…' : 'Não disponível') : 'Não atribuído'}</p><p className="text-xs text-muted-foreground">Criada em {formatDate(delivery.criado_em)} · Atualizada em {formatDate(delivery.atualizado_em)}</p></div>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t pt-4"><div className="w-full sm:w-52"><Field label={savingStatus === delivery.id ? 'Salvando status…' : 'Alterar status'}><Select value={delivery.status} disabled={locked || loading} onChange={(event) => void changeStatus(delivery, event.target.value as DeliveryStatus)}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field></div><Button variant="secondary" disabled={locked || driversLoading || !!driversError} onClick={() => openEditor({ kind: 'delivery', record: delivery })}>Editar entrega</Button></div>
                  </article>;
                })}
              </div>}
              <div className="flex items-center justify-between gap-3"><Button variant="secondary" disabled={page === 0 || loading || locked} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {page + 1}</span><Button variant="secondary" disabled={!hasNext || loading || locked || !!error} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div>
            </> : driversLoading ? <Loading text="Carregando entregadores…" /> : driversError ? null : drivers.length === 0 ? <Empty title="Sua equipe começa aqui" description="Cadastre o primeiro entregador com nome, telefone e tipo de veículo." /> : <div className={`grid gap-4 ${editor ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
              {drivers.map((driver) => <article key={driver.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{driver.nome.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><h3 className="break-words font-bold">{driver.nome}</h3><p className="mt-1 text-sm text-muted-foreground">{driver.tipo_veiculo === 'moto' ? 'Moto' : 'Carro'}</p></div></div><dl className="my-5 space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Telefone</dt><dd className="mt-1 break-words">{driver.telefone || 'Não informado'}</dd></div><div><dt className="text-xs text-muted-foreground">Identificador</dt><dd className="mt-1 break-all text-xs text-muted-foreground">{driver.id}</dd></div></dl><div className="mt-auto flex flex-wrap gap-2 border-t pt-4"><Button variant="secondary" disabled={locked} onClick={() => openEditor({ kind: 'driver', record: driver })}>Editar</Button><Button variant="secondary" disabled={locked} onClick={() => { setDriverFilter(driver.id); setStatusFilter(''); setPage(0); setTab('deliveries'); setNotice(''); }}>Ver entregas</Button></div></article>)}
            </div>}
          </section>
        </div>
        <footer className="border-t pt-6 text-xs text-muted-foreground">Central de Entregas · Acesso administrativo protegido</footer>
      </main>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <div role="status" className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground"><span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" aria-hidden="true" />{text}</div>;
}

function Empty({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><span aria-hidden="true" className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-xl text-primary">＋</span><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p></div>;
}
