import { lazy, Suspense } from 'react';
import { Button, Result, Spin, Typography } from 'antd';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  RouterProvider,
  useNavigate,
  useRouteError,
  type RouteObject,
} from 'react-router-dom';
import { env } from '../config/env';
import { routeDefinitions } from '../config/routes';
import AppLayout from '../layouts/AppLayout';
import { copy } from '../config/copy';

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function RouteLoading() {
  return (
    <div className="routeLoading" role="status" aria-live="polite">
      <Spin size="large" />
      <span>页面加载中…</span>
    </div>
  );
}

function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const notFound = status === 404;

  return (
    <Result
      status={notFound ? '404' : '500'}
      title={
        <Typography.Title level={1} style={{ margin: 0, fontSize: 24 }}>
          {notFound ? copy.errors.title404 : copy.errors.title500}
        </Typography.Title>
      }
      subTitle={
        notFound ? copy.errors.subtitle404 : copy.errors.subtitle500
      }
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {copy.errors.home}
        </Button>
      }
    />
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

const children: RouteObject[] = routeDefinitions.map((route) => ({
  path: route.path === '/' ? undefined : route.path.replace(/^\//, ''),
  index: route.path === '/',
  element: withSuspense(<route.component />),
  handle: { title: route.title, label: route.label, path: route.path },
}));

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        ...children,
        {
          path: '*',
          element: withSuspense(<NotFoundPage />),
          handle: { title: copy.errors.title404, label: copy.errors.title404 },
        },
      ],
    },
  ],
  { basename: env.basePath === '/' ? undefined : env.basePath },
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
