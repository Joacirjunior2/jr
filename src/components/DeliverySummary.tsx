import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { errorMessage, statuses, type DeliveryStatus } from '@/lib/delivery';
import { Button, Notice } from '@/components/ui/controls';

type StatusCount = { status: DeliveryStatus; count: number };

export function DeliverySummary({ revision }: { revision: number }) {
  const [counts, setCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const client = supabase;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (!client) throw new Error('A conexão com o banco está indisponível.');
        const results = await Promise.all(statuses.map(async (status): Promise<StatusCount> => {
          const { count, error: readError } = await client
            .from('entregas')
            .select('id', { count: 'exact', head: true })
            .eq('status', status.value);
          if (readError) throw readError;
          if (count === null) throw new Error('Não foi possível obter a contagem de entregas.');
          return { status: status.value, count };
        }));
        if (active) setCounts(results);
      } catch (cause) {
        if (active) {
          setCounts([]);
          setError(errorMessage(cause));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [revision, retry]);

  return (
    <section aria-labelledby="delivery-summary-title" aria-busy={loading} className="space-y-4 text-foreground">
      <div>
        <h2 id="delivery-summary-title" className="text-xl font-bold">Resumo por status</h2>
        <p className="mt-1 text-sm text-muted-foreground">Todas as entregas disponíveis para sua conta, independentemente dos filtros da listagem.</p>
      </div>
      {error ? (
        <div className="space-y-3">
          <Notice error>Não foi possível carregar o resumo: {error}</Notice>
          <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          {loading && <p role="status" className="text-sm text-muted-foreground">Carregando resumo…</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {statuses.map((status) => (
              <div key={status.value} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <dt className="text-sm font-medium">
                  <span className={`inline-block rounded-full border px-2 py-1 text-xs ${status.color}`}>{status.label}</span>
                </dt>
                <dd className="mt-4 text-3xl font-bold tabular-nums">
                  {loading ? '—' : (counts.find((item) => item.status === status.value)?.count ?? 0).toLocaleString('pt-BR')}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
