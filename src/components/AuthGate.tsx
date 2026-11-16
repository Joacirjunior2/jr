import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/delivery';
import { Button, Field, Input, Notice } from '@/components/ui/controls';

export function AuthGate({ children }: { children: (session: Session) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    let active = true;
    let receivedEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (active) { setSession(next); setLoading(false); }
    });
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || receivedEvent) return;
      setSession(data.session);
      if (sessionError) setError(errorMessage(sessionError));
      setLoading(false);
    }).catch((cause: unknown) => {
      if (active && !receivedEvent) { setError(errorMessage(cause)); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) throw loginError;
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : errorMessage(cause));
    } finally { setBusy(false); }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  if (session?.user.app_metadata?.equipe_gestao === true) return <>{children(session)}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">CE</span>
          <div><p className="text-lg font-bold">Central de Entregas</p><p className="text-sm text-muted-foreground">Área administrativa</p></div>
        </div>
        {loading ? <p role="status" className="py-8 text-center text-muted-foreground">Verificando acesso…</p> : !supabase ? (
          <Notice error>A conexão com o banco está indisponível: as variáveis públicas do Supabase não foram disponibilizadas para esta versão do app.</Notice>
        ) : session ? (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold">Acesso restrito</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">Esta conta não pertence à equipe de gestão. Um administrador precisa conceder a permissão equipe_gestao nos metadados administrativos da conta.</p>
            {error && <Notice error>{error}</Notice>}
            <Button className="w-full" disabled={busy} onClick={logout}>Sair e usar outra conta</Button>
          </div>
        ) : (
          <form onSubmit={login} className="space-y-5">
            <div><h1 className="text-2xl font-bold">Bem-vindo de volta</h1><p className="mt-2 text-sm text-muted-foreground">Entre com sua conta da equipe de gestão.</p></div>
            {error && <Notice error>{error}</Notice>}
            <Field label="E-mail"><Input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></Field>
            <Field label="Senha"><Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></Field>
            <Button className="w-full" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no painel'}</Button>
            <p className="text-center text-xs text-muted-foreground">Acesso exclusivo para contas autorizadas.</p>
          </form>
        )}
      </section>
    </main>
  );
}
