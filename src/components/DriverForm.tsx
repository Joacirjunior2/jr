import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { emptyDriver, errorMessage, type Driver, type DriverDraft } from '@/lib/delivery';
import { Button, Field, Input, Select, Notice } from '@/components/ui/controls';

type Props = { driver: Driver | null; onCancel: () => void; onSaved: () => void };

export function DriverForm({ driver, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState<DriverDraft>(driver ? { nome: driver.nome, telefone: driver.telefone ?? '', tipo_veiculo: driver.tipo_veiculo } : { ...emptyDriver });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (!draft.nome.trim()) { setError('Informe o nome do entregador.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { nome: draft.nome.trim(), telefone: draft.telefone.trim() || null, tipo_veiculo: draft.tipo_veiculo };
      const query = driver ? supabase.from('entregadores').update(payload).eq('id', driver.id) : supabase.from('entregadores').insert(payload);
      const { error: saveError } = await query.select('id').single();
      if (saveError) throw saveError;
      onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="driver-form-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="driver-form-title" className="text-xl font-bold">{driver ? 'Editar entregador' : 'Novo entregador'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Nome e tipo de veículo são obrigatórios.</p>
      {driver && <p className="mt-3 break-all text-xs text-muted-foreground">ID: {driver.id}</p>}
      <form className="mt-6 space-y-5" onSubmit={save}>
        {error && <Notice error>{error}</Notice>}
        <fieldset disabled={busy} className="space-y-5">
          <Field label="Nome *"><Input autoFocus required value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} placeholder="Nome do entregador" /></Field>
          <Field label="Telefone"><Input type="tel" autoComplete="tel" value={draft.telefone} onChange={(event) => setDraft({ ...draft, telefone: event.target.value })} placeholder="DDD + número" /></Field>
          <Field label="Tipo de veículo *"><Select required value={draft.tipo_veiculo} onChange={(event) => setDraft({ ...draft, tipo_veiculo: event.target.value as Driver['tipo_veiculo'] })}><option value="moto">Moto</option><option value="carro">Carro</option></Select></Field>
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t pt-5"><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar entregador'}</Button><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
      </form>
    </section>
  );
}
