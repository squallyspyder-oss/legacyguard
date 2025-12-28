import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import './index.css';
import { authClient } from './lib/auth';

const HomePage = lazy(() => import('./pages/home'));
const AuthPage = lazy(() => import('./pages/auth'));
const AccountPage = lazy(() => import('./pages/account'));

function Loader() {
  return <div style={{ padding: 24, textAlign: 'center' }}>Carregando…</div>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/account',
    element: <AccountPage />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NeonAuthUIProvider authClient={authClient}>
      <Suspense fallback={<Loader />}>
        <RouterProvider router={router} />
      </Suspense>
    </NeonAuthUIProvider>
  </StrictMode>,
);
