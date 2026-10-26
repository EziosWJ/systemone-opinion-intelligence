import { useMemo, useState } from 'react';
import { App, Button, Drawer, Select, Space, Tag, Typography } from 'antd';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { DetailSection } from '../../../components/DetailFields/DetailFields';
import { ReviewDecisionForm } from '../components/ReviewDecisionForm';
import { copy } from '../../../config/copy';
import { useAnalysisResult, useReviews, useSubmitReview } from '../hooks';
import type { AnalysisResultRow } from '../api/analysis.api';

const { Text, Paragraph } = Typography;

const QUEUE_OPTIONS = [
  { value: 'pending', label: '待复核' },
  { value: 'uncertain', label: '存疑（继续跟进）' },
  { value: 'confirmed', label: '已确认' },
  { value: 'rejected', label: '已驳回' },
  { value: 'all', label: '全部' },
];

const SENTIMENT_LABEL: Record<string, string> = {
  positive: '正面', neutral: '中性', negative: '负面', mixed: '混合', unclear: '含混',
};

export default function ReviewsPage() {
  const { message } = App.useApp();
  const [detailId, setDetailId] = useState<string | null>(null);

  const listState = useListUrlState({
    filterKeys: ['status'],
    allowedFilterValues: { status: QUEUE_OPTIONS.map((o) => o.value) },
    defaultSort: { field: 'reviewPriority', order: 'desc' },
    allowedSortFields: ['reviewPriority'],
  });

  const queueStatus = listState.state.filters.status || 'pending';
  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      status: queueStatus,
      keyword: listState.state.keyword || undefined,
    }),
    [listState.state, queueStatus],
  );

  const { data, isLoading, isError, error, refetch } = useReviews(queryParams);
  const { data: detail } = useAnalysisResult(detailId ?? '');
  const submitReview = useSubmitReview();

  const columns = useMemo(
    () => [
      { title: '结果 ID', dataIndex: 'id', key: 'id', width: 110 },
      { title: '评论', dataIndex: 'commentText', key: 'commentText', ellipsis: true },
      {
        title: '优先级',
        dataIndex: 'reviewPriority',
        key: 'reviewPriority',
        width: 90,
        sorter: true,
        render: (v: number) => <Tag color={v >= 75 ? 'orange' : 'default'}>{v}</Tag>,
      },
      { title: '情绪', dataIndex: 'sentiment', key: 'sentiment', width: 80, render: (s: string) => <Tag>{SENTIMENT_LABEL[s] ?? s}</Tag> },
      {
        title: '当前复核',
        dataIndex: 'reviewStatus',
        key: 'reviewStatus',
        width: 100,
        render: (status: string) => <StatusTag kind="review" value={status} />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        hideInSettings: true,
        render: (_: unknown, record: AnalysisResultRow) => (
          <Space size={4}>
            <Button size="small" onClick={() => setDetailId(record.id)}>
              复核
            </Button>
            <Button
              size="small"
              type="primary"
              ghost
              loading={submitReview.isPending && submitReview.variables?.resultId === record.id}
              onClick={() =>
                submitReview.mutate(
                  { resultId: record.id, status: 'confirmed' },
                  { onSuccess: () => message.success('已确认，队列已更新') },
                )
              }
            >
              快速确认
            </Button>
          </Space>
        ),
      },
    ],
    [submitReview, message],
  );

  return (
    <ListPageTemplate
      header={{
        title: '人工复核',
        description: '待复核队列按复核优先级排序。确认 / 存疑 / 驳回均追加留痕，最新决策为当前状态。',
      }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索评论文本 / 结果 ID"
          resultSummary={data ? <Text type="secondary">{copy.table.total(data.total)} · {copy.common.demoMemory}</Text> : undefined}
          filters={
            <Select
              placeholder="队列"
              style={{ width: 180 }}
              value={queueStatus}
              onChange={(value) => listState.setFilter('status', value)}
              options={QUEUE_OPTIONS}
              aria-label="复核队列筛选"
            />
          }
        />
      }
    >
      <DataTable<AnalysisResultRow>
        tableId="review-queue"
        tableLabel="复核队列"
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
        emptyDescription="当前队列为空。创建并推进研判任务后，结果会进入待复核队列。"
      />
      <Drawer open={detailId !== null} onClose={() => setDetailId(null)} title="复核详情" width={600}>
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <DetailSection title="评论文本">
              <Paragraph>{detail.commentText}</Paragraph>
            </DetailSection>
            <DetailSection title="原帖上下文">
              <Paragraph>{detail.postText ?? '缺少上下文'}</Paragraph>
            </DetailSection>
            <DetailSection title="评分摘要（模拟）">
              <Text>
                相关性 {detail.relevance} · 反讽可能性 {detail.ironyProbability} · 优先级 {detail.reviewPriority} · 置信度 {detail.confidence}
              </Text>
              <Paragraph type="secondary" style={{ marginTop: 4 }}>
                {detail.explanation}
              </Paragraph>
            </DetailSection>
            <ReviewDecisionForm
              currentStatus={detail.reviewStatus}
              history={detail.reviewHistory}
              submitting={submitReview.isPending}
              onSubmit={(status, note) =>
                submitReview.mutate(
                  { resultId: detail.id, status, note },
                  { onSuccess: () => message.success('复核结论已保存') },
                )
              }
            />
          </Space>
        ) : (
          <Text type="secondary">加载中…</Text>
        )}
      </Drawer>
    </ListPageTemplate>
  );
}
