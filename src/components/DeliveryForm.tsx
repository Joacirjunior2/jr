import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { emptyDelivery, errorMessage, formatDate, statuses, type Delivery, type DeliveryDraft, type DeliveryStatus, type Driver } from '@/lib/delivery';
import { Button, Field, Input, Select, Textarea, Notice } from '@/components/ui/controls';

type Props = { delivery: Delivery | null; drivers: Driver[]; onCancel: () => void; onSaved: () => void };

export function DeliveryForm({ delivery, drivers, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState<DeliveryDraft>(delivery ? {
    origem_site: delivery.origem_site,
    referencia_pedido: delivery.referencia_pedido,
    endereco_coleta: delivery.endereco_coleta,
    endereco_destino: delivery.endereco_destino,
    entregador_id: delivery.entregador_id ?? '',
    status: delivery.status,
  } : { ...emptyDelivery });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    const payload = {
      origem_site: draft.origem_site.trim(),
      referencia_pedido: draft.referencia_pedido.trim(),
      endereco_coleta: draft.endereco_coleta.trim(),
      endereco_destino: draft.endereco_destino.trim(),
      entregador_id: draft.entregador_id || null,
      status: draft.status,
    };
    if (!payload.origem_site || !payload.referencia_pedido || !payload.endereco_coleta || !payload.endereco_destino) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setBusy(true); setError('');
    try {
      const query = delivery ? supabase.from('entregas').update(payload).eq('id', delivery.id) : supabase.from('entregas').insert(payload);
      const { error: saveError } = await query.select('id').single();
      if (saveError) throw saveError;
      onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="delivery-form-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="delivery-form-title" className="text-xl font-bold">{delivery ? 'Editar entrega' : 'Nova entrega'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Organize o pedido, a rota e o responsável. * Campos obrigatórios.</p>
      {delivery && <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p className="break-all">ID: {delivery.id}</p><p>Criada em {formatDate(delivery.criado_em)}</p><p>Atualizada em {formatDate(delivery.atualizado_em)}</p></div>}
      <form className="mt-6 space-y-5" onSubmit={save}>
        {error && <Notice error>{error}</Notice>}
        <fieldset disabled={busy} className="space-y-5">
          <Field label="Site de origem *"><Input autoFocus required value={draft.origem_site} onChange={(event) => setDraft({ ...draft, origem_site: event.target.value })} placeholder="Nome ou endereço do site" /></Field>
          <Field label="Referência do pedido *"><Input required value={draft.referencia_pedido} onChange={(event) => setDraft({ ...draft, referencia_pedido: event.target.value })} placeholder="Código do pedido" /></Field>
          <Field label="Endereço de coleta *"><Textarea required value={draft.endereco_coleta} onChange={(event) => setDraft({ ...draft, endereco_coleta: event.target.value })} placeholder="Rua, número, complemento, bairro e cidade" /></Field>
          <Field label="Endereço de destino *"><Textarea required value={draft.endereco_destino} onChange={(event) => setDraft({ ...draft, endereco_destino: event.target.value })} placeholder="Rua, número, complemento, bairro e cidade" /></Field>
          <Field label="Entregador"><Select value={draft.entregador_id} onChange={(event) => setDraft({ ...draft, entregador_id: event.target.value })}>
            <option value="">Sem entregador</option>
            {draft.entregador_id && !drivers.some((driver) => driver.id === draft.entregador_id) && <option value={draft.entregador_id}>Entregador indisponível ({draft.entregador_id})</option>}
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nome} · {driver.tipo_veiculo}{driver.telefone ? ` · ${driver.telefone}` : ''} · {driver.id.slice(0, 8)}</option>)}
          </Select></Field>
          {drivers.length === 0 && <p className="text-sm text-muted-foreground">Cadastre um entregador na aba Entregadores para atribuir esta entrega.</p>}
          <Field label="Status *"><Select required value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as DeliveryStatus })}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</Select></Field>
        </fieldset>
        <p className="text-xs text-muted-foreground">O identificador e as datas são gerados automaticamente pelo banco.</p>
        <div className="flex flex-wrap gap-3 border-t pt-5"><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar entrega'}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
      </form>
    </section>
  );
}
