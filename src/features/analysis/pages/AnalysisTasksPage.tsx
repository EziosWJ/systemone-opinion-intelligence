import { useMemo, useState } from 'react';
import { App, Button, Drawer, Form, InputNumber, Progress, Radio, Select, Space, Tag, Typography } from 'antd';
import { PlayCircle, Plus } from 'lucide-react';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { copy } from '../../../config/copy';
import { useAdvanceAnalysisTask, useAnalysisTask, useAnalysisTasks, useCreateAnalysisTask, useRules } from '../hooks';
import { useTopicList } from '../../topics/hooks';
import { formatDateTime } from '../../../utils/format';
import type { AnalysisTaskWithCount } from '../api/analysis.api';
import type { TaskStatus } from '../../../types/entities';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'pending', label: '待执行' },
  { value: 'running', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

export default function AnalysisTasksPage() {
  const { message } = App.useApp();
  const [detailId, setDetailId] = useState<string | null>(null);

  const listState = useListUrlState({
    filterKeys: ['status', 'ruleId'],
    allowedFilterValues: { status: STATUS_OPTIONS.map((o) => o.value) },
    defaultSort: { field: 'createdAt', order: 'desc' },
    allowedSortFields: ['createdAt'],
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      status: (listState.state.filters.status as TaskStatus | undefined) ?? undefined,
      ruleId: listState.state.filters.ruleId || undefined,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = useAnalysisTasks(queryParams);
  const { data: rules } = useRules();
  const { data: detail } = useAnalysisTask(detailId ?? '');
  const advance = useAdvanceAnalysisTask();
  const createTask = useCreateAnalysisTask();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<{ ruleId: string; scope: 'all' | 'topic'; topicId?: string; limit?: number }>();

  const columns = useMemo(
    () => [
      { title: '任务 ID', dataIndex: 'id', key: 'id', width: 100 },
      {
        title: '规则',
        key: 'rule',
        width: 180,
        render: (_: unknown, record: AnalysisTaskWithCount) => (
          <Space size={4}>
            <Tag color="blue">{record.ruleId}</Tag>
            <Tag>v{record.ruleVersion}</Tag>
          </Space>
        ),
      },
      {
        title: '进度',
        key: 'progress',
        width: 200,
        render: (_: unknown, record: AnalysisTaskWithCount) => (
          <Space size={4}>
            <Progress percent={Math.round((record.processed / Math.max(1, record.total)) * 100)} size="small" style={{ width: 120 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.processed}/{record.total}
            </Text>
          </Space>
        ),
      },
      { title: '结果数', dataIndex: 'resultCount', key: 'resultCount', width: 90 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => <StatusTag kind="task" value={status} />,
      },
      { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: formatDateTime },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        hideInSettings: true,
        render: (_: unknown, record: AnalysisTaskWithCount) => (
          <Space size={4}>
            {(record.status === 'pending' || record.status === 'running') && (
              <Button
                size="small"
                icon={<PlayCircle size={14} />}
                loading={advance.isPending && advance.variables === record.id}
                onClick={() =>
                  advance.mutate(record.id, {
                    onSuccess: (task) =>
                      message.success(task.status === 'completed' ? '任务已完成，研判结果已生成' : '任务进度已推进（模拟评分引擎）'),
                  })
                }
              >
                推进
              </Button>
            )}
            {record.resultCount > 0 && (
              <Button size="small" type="link" onClick={() => setDetailId(record.id)}>
                详情
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [advance, message],
  );

  return (
    <ListPageTemplate
      header={{
        title: 'AI 研判任务中心',
        description: '配置规则模板并批量执行模拟多维评分。演示环境使用确定性 MockAnalysisEngine，不调用真实模型。',
      }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索任务 ID"
          resultSummary={data ? <Text type="secondary">{copy.table.total(data.total)} · 模拟评分，仅供演示</Text> : undefined}
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
                placeholder="规则"
                style={{ width: 200 }}
                value={listState.state.filters.ruleId}
                onChange={(value) => listState.setFilter('ruleId', value)}
                options={(rules?.items ?? []).map((rule) => ({ value: rule.id, label: `${rule.name} v${rule.version}` }))}
                aria-label="规则筛选"
              />
            </>
          }
          actions={
            <Button type="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
              新建研判任务
            </Button>
          }
        />
      }
    >
      <DataTable<AnalysisTaskWithCount>
        tableId="analysis-tasks"
        tableLabel="研判任务列表"
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
        emptyDescription="尚无研判任务，点击右上角新建。"
      />
      <Drawer open={detailId !== null} onClose={() => setDetailId(null)} title={`任务 ${detailId ?? ''}`} width={480}>
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Progress percent={Math.round((detail.processed / Math.max(1, detail.total)) * 100)} />
            <Text>
              规则 {detail.ruleId} v{detail.ruleVersion} · 状态 <StatusTag kind="task" value={detail.status} /> · 结果数 {detail.resultCount}
            </Text>
            <Button
              type="primary"
              onClick={() =>
                advance.mutate(detail.id, {
                  onSuccess: () => message.success('任务进度已推进'),
                })
              }
              disabled={detail.status === 'completed'}
              loading={advance.isPending}
            >
              推进任务
            </Button>
          </Space>
        ) : (
          <Text type="secondary">加载中…</Text>
        )}
      </Drawer>
      <Drawer open={createOpen} title="新建研判任务" width={480} onClose={() => setCreateOpen(false)}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ scope: 'all', limit: 100 }}
          onFinish={(values) =>
            createTask.mutate(
              {
                ruleId: values.ruleId,
                topicId: values.scope === 'topic' ? values.topicId : undefined,
                limit: values.limit,
              },
              {
                onSuccess: (task) => {
                  message.success(`任务 ${task.id} 已创建，覆盖 ${task.total} 条评论；使用“推进”按钮执行模拟评分`);
                  setCreateOpen(false);
                  form.resetFields();
                },
              },
            )
          }
        >
          <Form.Item name="ruleId" label="规则模板" rules={[{ required: true, message: '请选择规则' }]}>
            <Select options={(rules?.items ?? []).map((rule) => ({ value: rule.id, label: `${rule.name} v${rule.version}` }))} />
          </Form.Item>
          <Form.Item name="scope" label="数据范围">
            <Radio.Group options={[{ value: 'all', label: '全部评论（抽样）' }, { value: 'topic', label: '按专题' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.scope !== next.scope}>
            {({ getFieldValue }) =>
              getFieldValue('scope') === 'topic' ? (
                <Form.Item name="topicId" label="专题" rules={[{ required: true, message: '请选择专题' }]}>
                  <TopicSelect />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="limit" label="抽样上限（条）" rules={[{ required: true }]}>
            <InputNumber min={10} max={500} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createTask.isPending} style={{ float: 'right' }}>
            创建任务
          </Button>
        </Form>
      </Drawer>
    </ListPageTemplate>
  );
}

function TopicSelect() {
  const { data } = useTopicList({ page: 1, pageSize: 100 });
  return <Select options={(data?.items ?? []).map((topic) => ({ value: topic.id, label: topic.title }))} />;
}
