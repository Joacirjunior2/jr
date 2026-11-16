import { createRootRoute, Outlet } from '@tanstack/react-router';

export const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Página não encontrada</h1>
        <a className="mt-5 inline-block font-medium text-primary underline" href="/">Voltar ao painel</a>
      </div>
    </main>
  ),
});
