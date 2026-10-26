import { useMemo, useState } from 'react';
import { App, Button, Form, Input, Space, Tag, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { FormDrawer } from '../../../components/FormDrawer/FormDrawer';
import { copy } from '../../../config/copy';
import { useCreateTopic, useTopicList } from '../hooks';
import { formatDateTime } from '../../../utils/format';
import type { TopicWithCounts } from '../api/topics.api';

const { Text } = Typography;

interface TopicCreateValues {
  title: string;
  summary?: string;
  keywords?: string;
}

const TopicCreateDrawer = FormDrawer<TopicCreateValues>;

export default function TopicsPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ title: string; summary?: string; keywords?: string }>();

  const listState = useListUrlState({
    defaultSort: { field: 'createdAt', order: 'asc' },
    allowedSortFields: ['createdAt', 'title'],
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      keyword: listState.state.keyword || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = useTopicList(queryParams);
  const createTopic = useCreateTopic();

  const columns = useMemo(
    () => [
      { title: '专题', dataIndex: 'title', key: 'title', width: 240, sorter: true, render: (t: string, record: TopicWithCounts) => <Link to={`/topics/${record.id}`}>{t}</Link> },
      { title: '摘要', dataIndex: 'summary', key: 'summary', ellipsis: true },
      {
        title: '关键词',
        dataIndex: 'keywords',
        key: 'keywords',
        width: 220,
        render: (keywords: string[]) => (
          <Space size={2} wrap>
            {keywords.map((keyword) => (
              <Tag key={keyword}>{keyword}</Tag>
            ))}
          </Space>
        ),
      },
      { title: '微博数', dataIndex: 'postCount', key: 'postCount', width: 90 },
      { title: '评论数', dataIndex: 'commentCount', key: 'commentCount', width: 90 },
      { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: formatDateTime, sorter: true },
    ],
    [],
  );

  return (
    <ListPageTemplate
      header={{
        title: '专题分析',
        description: '聚合评论与研判结果的热点事件专题。统计数据实时来自内存 DB，与工作台口径一致。',
      }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索专题标题 / 关键词"
          resultSummary={data ? <Text type="secondary">{copy.table.total(data.total)} · {copy.common.demoMemory}</Text> : undefined}
          actions={
            <Button type="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
              新建专题
            </Button>
          }
        />
      }
    >
      <DataTable<TopicWithCounts>
        tableId="topics"
        tableLabel="专题列表"
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
        onSortChange={(field: string | undefined, order: 'asc' | 'desc' | undefined) => listState.setSort(field, order)}
      />
      <TopicCreateDrawer
        open={open}
        title="新建专题"
        description="创建后可在专题详情关联评论、查看趋势与观点分布。"
        form={form}
        onClose={() => setOpen(false)}
        submitting={createTopic.isPending}
        error={createTopic.error}
        onFinish={(values: TopicCreateValues) =>
          createTopic.mutate(
            {
              title: values.title,
              summary: values.summary,
              keywords: values.keywords?.split(/[,，\s]+/).map((k: string) => k.trim()).filter(Boolean),
            },
            {
              onSuccess: (topic) => {
                message.success('专题已创建');
                setOpen(false);
                form.resetFields();
                navigate(`/topics/${topic.id}`);
              },
            },
          )
        }
      >
        <Form.Item name="title" label="专题标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="例如：城市公共自行车停放新规" />
        </Form.Item>
        <Form.Item name="summary" label="摘要">
          <Input.TextArea rows={3} placeholder="一句话描述专题关注点" />
        </Form.Item>
        <Form.Item name="keywords" label="关键词（逗号分隔）">
          <Input placeholder="关键词1, 关键词2" />
        </Form.Item>
      </TopicCreateDrawer>
    </ListPageTemplate>
  );
}
