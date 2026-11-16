import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/routes/__root';
import { AuthGate } from '@/components/AuthGate';
import { AdminDashboard } from '@/components/AdminDashboard';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <AuthGate>{(session) => <AdminDashboard key={session.user.id} session={session} />}</AuthGate>,
});
