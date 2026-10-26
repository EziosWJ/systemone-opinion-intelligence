import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@ant-design/charts', () => ({
  Line: () => <div data-testid="chart-line" />,
  Pie: () => <div data-testid="chart-pie" />,
  Area: () => <div data-testid="chart-area" />,
}));
import { screen, waitFor } from '@testing-library/react';
import WorkbenchPage from '../../src/features/analysis/pages/WorkbenchPage';
import ReviewsPage from '../../src/features/analysis/pages/ReviewsPage';
import CaptureTasksPage from '../../src/features/capture/pages/CaptureTasksPage';
import PostsPage from '../../src/features/capture/pages/PostsPage';
import CommentsPage from '../../src/features/capture/pages/CommentsPage';
import TopicsPage from '../../src/features/topics/pages/TopicsPage';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderRoutes } from '../testUtils';
import { db } from '../../src/mocks/db/database';
import { analysisApi } from '../../src/features/analysis/api/analysis.api';

// Seed a small analysis run so review/workbench pages have data to render.
beforeAll(async () => {
  db.reset();
  const task = await analysisApi.createTask({ ruleId: 'rule_semantics', commentIds: db.comments.slice(0, 12).map((c) => c.id) });
  let current = await analysisApi.advanceTask(task.id);
  let guard = 0;
  while (current.status !== 'completed' && guard < 10) {
    current = await analysisApi.advanceTask(task.id);
    guard += 1;
  }
});
function renderPage(path: string, element: React.ReactElement) {
  return renderRoutes([{ path, element }], { route: path });
}

describe('page rendering smoke tests', () => {
  it('dashboard renders KPIs from the aggregate API', async () => {
    renderPage('/', <DashboardPage />);
    await waitFor(() => expect(screen.getByText('采集评论总量')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('热点专题排名（按关联评论数）')).toBeInTheDocument());
  });

  it('capture tasks page renders seeded tasks', async () => {
    renderPage('/capture/tasks', <CaptureTasksPage />);
    await waitFor(() => expect(screen.getByRole('region', { name: '采集任务列表' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('cap_001')).toBeInTheDocument());
  });

  it('posts page renders 300-post library', async () => {
    renderPage('/capture/posts', <PostsPage />);
    await waitFor(() => expect(screen.getByRole('region', { name: '微博内容列表' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/共 300 条/)[0]).toBeInTheDocument());
  });

  it('comments page renders 10k comments with pagination', async () => {
    renderPage('/capture/comments', <CommentsPage />);
    await waitFor(
      () => expect(screen.getAllByText(/共 ?10,?000 条/).length).toBeGreaterThan(0),
      { timeout: 15000 },
    );
  }, 30000);

  it('workbench renders analysis results with scores', async () => {
    renderPage('/analysis/workbench', <WorkbenchPage />);
    await waitFor(() => expect(screen.getByRole('region', { name: '研判结果列表' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/共 12 条/)[0]).toBeInTheDocument());
  });

  it('reviews page shows the pending queue', async () => {
    renderPage('/analysis/reviews', <ReviewsPage />);
    await waitFor(() => expect(screen.getByRole('region', { name: '复核队列' })).toBeInTheDocument());
  });

  it('topics page renders the four seeded topics', async () => {
    renderPage('/topics', <TopicsPage />);
    await waitFor(() => expect(screen.getByRole('region', { name: '专题列表' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('虚构城市公共交通票价调整')).toBeInTheDocument());
  });
});
