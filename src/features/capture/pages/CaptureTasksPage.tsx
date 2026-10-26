import { useMemo, useState } from 'react';
import { App, Button, Modal, Progress, Select, Space, Tag, Typography } from 'antd';
import { Plus, PlayCircle, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { copy } from '../../../config/copy';
import { useAdvanceCaptureTask, useCancelCaptureTask, useCaptureTaskList, useCreateCaptureTask } from '../hooks';
import { useTopicList } from '../../topics/hooks';
import { formatDateTime } from '../../../utils/format';
import type { CaptureTask, TaskStatus } from '../../../types/entities';
import type { CreateCaptureTaskBody } from '../api/capture.api';
import CreateCaptureTaskForm from '../components/CreateCaptureTaskForm';

const { Text } = Typography;

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending', label: '待执行' },
  { value: 'running', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'canceled', label: '已取消' },
];

const MODE_LABEL: Record<CaptureTask['mode'], string> = { url: '微博链接', keyword: '关键词', import: '文件导入' };

export default function CaptureTasksPage() {
  const { message } = App.useApp();
  const [cancelTarget, setCancelTarget] = useState<CaptureTask | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const listState = useListUrlState({
    filterKeys: ['status', 'mode'],
    allowedFilterValues: {
      status: STATUS_OPTIONS.map((option) => option.value),
      mode: ['url', 'keyword', 'import'],
    },
    defaultSort: { field: 'createdAt', order: 'desc' },
    allowedSortFields: ['createdAt', 'processed'],
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      keyword: listState.state.keyword || undefined,
      status: (listState.state.filters.status as TaskStatus | undefined) ?? undefined,
      mode: (listState.state.filters.mode as CaptureTask['mode'] | undefined) ?? undefined,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = useCaptureTaskList(queryParams);
  const advance = useAdvanceCaptureTask();
  const cancelTask = useCancelCaptureTask();
  const createTask = useCreateCaptureTask();
  const { data: topics } = useTopicList({ page: 1, pageSize: 100 });

  const columns = useMemo(
    () => [
      { title: '任务 ID', dataIndex: 'id', key: 'id', width: 100 },
      {
        title: '模式',
        dataIndex: 'mode',
        key: 'mode',
        width: 100,
        render: (mode: CaptureTask['mode']) => <Tag>{MODE_LABEL[mode]}</Tag>,
      },
      { title: '采集条件', dataIndex: 'input', key: 'input', ellipsis: true },
      {
        title: '进度',
        key: 'progress',
        width: 170,
        render: (_: unknown, record: CaptureTask) => (
          <Space size={4}>
            <Progress
              percent={Math.round((record.processed / Math.max(1, record.total)) * 100)}
              size="small"
              status={record.status === 'failed' ? 'exception' : undefined}
              style={{ width: 110 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.processed}/{record.total}
            </Text>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => <StatusTag kind="task" value={status} />,
      },
      { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: formatDateTime },
      { title: '最后更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: formatDateTime },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        hideInSettings: true,
        render: (_: unknown, record: CaptureTask) => (
          <Space size={4}>
            {(record.status === 'pending' || record.status === 'running') && (
              <Button
                size="small"
                icon={<PlayCircle size={14} />}
                loading={advance.isPending && advance.variables === record.id}
                onClick={() =>
                  advance.mutate(record.id, {
                    onSuccess: (task) => {
                      message.success(task.status === 'completed' ? '任务已完成，已生成关联帖子与评论' : '任务进度已推进');
                    },
                    onError: (err) => message.error(String(err)),
                  })
                }
              >
                推进
              </Button>
            )}
            {(record.status === 'pending' || record.status === 'running') && (
              <Button size="small" danger icon={<Ban size={14} />} onClick={() => setCancelTarget(record)}>
                取消
              </Button>
            )}
            {record.status === 'completed' && (
              <Link to={`/capture/posts?keyword=${encodeURIComponent(record.input.slice(0, 8))}`}>
                <Button size="small" type="link">查看产出</Button>
              </Link>
            )}
          </Space>
        ),
      },
    ],
    [advance, message],
  );

  return (
    <ListPageTemplate
      header={{ title: '采集任务', description: '创建与管理微博链接、关键词和文件导入采集任务（演示环境模拟执行，无真实外部请求）。' }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          resultSummary={
            data ? <Text type="secondary">{copy.table.total(data.total)} · {copy.common.demoMemory}</Text> : undefined
          }
          filters={
            <>
              <Select
                allowClear
                placeholder="状态"
                style={{ width: 120 }}
                value={listState.state.filters.status}
                onChange={(value) => listState.setFilter('status', value)}
                options={STATUS_OPTIONS}
                aria-label="状态筛选"
              />
              <Select
                allowClear
                placeholder="模式"
                style={{ width: 120 }}
                value={listState.state.filters.mode}
                onChange={(value) => listState.setFilter('mode', value)}
                options={[
                  { value: 'url', label: '微博链接' },
                  { value: 'keyword', label: '关键词' },
                  { value: 'import', label: '文件导入' },
                ]}
                aria-label="模式筛选"
              />
            </>
          }
          actions={
            <Button type="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
              新建采集任务
            </Button>
          }
        />
      }
    >
      <DataTable<CaptureTask>
        tableId="capture-tasks"
        tableLabel="采集任务列表"
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => refetch()}
        pagination={{
          current: listState.state.page,
          pageSize: listState.state.pageSize,
          total: data?.total ?? 0,
          onChange: (page, pageSize) => {
            if (page !== listState.state.page) listState.setPage(page);
            if (pageSize !== listState.state.pageSize) listState.setPageSize(pageSize);
          },
        }}
        sortState={{ field: listState.state.sortBy, order: listState.state.sortOrder }}
        onSortChange={(field, order) => listState.setSort(field, order)}
        emptyDescription="尚无采集任务，点击右上角新建。"
      />
      <CreateCaptureTaskForm
        open={createOpen}
        topics={topics?.items ?? []}
        submitting={createTask.isPending}
        error={createTask.error}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values: CreateCaptureTaskBody) =>
          createTask.mutate(values, {
            onSuccess: (task) => {
              message.success(`任务 ${task.id} 已创建（演示模式，使用“推进”按钮模拟执行）`);
              setCreateOpen(false);
            },
          })
        }
      />
      <Modal
        open={cancelTarget !== null}
        title="确认取消任务"
        okText="取消任务"
        okButtonProps={{ danger: true }}
        onCancel={() => setCancelTarget(null)}
        onOk={async () => {
          if (!cancelTarget) return;
          await cancelTask.mutateAsync(cancelTarget.id);
          message.success('任务已取消');
          setCancelTarget(null);
        }}
      >
        <p>
          确定取消任务 <Text code>{cancelTarget?.id}</Text> 吗？该操作不可恢复。
        </p>
      </Modal>
    </ListPageTemplate>
  );
}
