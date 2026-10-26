import { useMemo } from 'react';
import { Button, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { copy } from '../../../config/copy';
import { useCreateReport, useReportList } from '../hooks';
import { useTopicList } from '../../topics/hooks';
import { formatDateTime } from '../../../utils/format';
import type { ReportRecord } from '../api/reports.api';

const { Text } = Typography;

export default function ReportsPage() {
  const navigate = useNavigate();
  const listState = useListUrlState({
    defaultSort: { field: 'generatedAt', order: 'desc' },
    allowedSortFields: ['generatedAt'],
  });

  const { data, isLoading, isError, error, refetch } = useReportList();
  const { data: topics } = useTopicList({ page: 1, pageSize: 100 });
  const createReport = useCreateReport();
  const topicOptions = useMemo(
    () => (topics?.items ?? []).map((topic) => ({ value: topic.id, label: topic.title })),
    [topics],
  );

  const columns = useMemo(
    () => [
      { title: '报告 ID', dataIndex: 'id', key: 'id', width: 100 },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (title: string, record: ReportRecord) => <Link to={`/reports/${record.id}`}>{title}</Link>,
      },
      {
        title: '专题',
        key: 'topic',
        width: 200,
        render: (_: unknown, record: ReportRecord) => (
          <Link to={`/topics/${record.topicId}`}>{topics?.items.find((t) => t.id === record.topicId)?.title ?? record.topicId}</Link>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => <StatusTag kind="report" value={status} />,
      },
      { title: '生成时间', dataIndex: 'generatedAt', key: 'generatedAt', width: 150, render: formatDateTime },
      { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: formatDateTime },
    ],
    [topics],
  );

  return (
    <ListPageTemplate
      header={{
        title: '报告中心',
        description: '基于专题快照生成的舆情简报。支持编辑、预览与 HTML 导出；导出内容与已保存正文一致。',
      }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索报告标题"
          resultSummary={data ? <Text type="secondary">{copy.table.total(data.total)} · {copy.common.demoMemory}</Text> : undefined}
          actions={
            <Button
              type="primary"
              icon={<Plus size={15} />}
              loading={createReport.isPending}
              disabled={!topicOptions.length}
              onClick={() => {
                if (!topicOptions.length) return;
                createReport.mutate(
                  { topicId: topicOptions[0].value },
                  {
                    onSuccess: (report) => {
                      navigate(`/reports/${report.id}`);
                    },
                  },
                );
              }}
            >
              为首个专题生成报告
            </Button>
          }
        />
      }
    >
      <DataTable<ReportRecord>
        tableId="reports"
        tableLabel="报告列表"
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
        emptyDescription="尚无报告。前往专题详情点击“生成报告”。"
      />
    </ListPageTemplate>
  );
}
