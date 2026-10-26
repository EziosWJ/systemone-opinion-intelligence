import { useMemo, useState } from 'react';
import { App, Button, Drawer, Progress, Select, Space, Tag, Typography } from 'antd';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { ExportButton } from '../../../components/ExportButton/ExportButton';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { DetailSection } from '../../../components/DetailFields/DetailFields';
import { ReviewDecisionForm } from '../components/ReviewDecisionForm';
import { copy } from '../../../config/copy';
import { useDataExport } from '../../../hooks/useDataExport';
import { useAnalysisResult, useAnalysisResults, useSubmitReview } from '../hooks';
import { useRules } from '../hooks';
import { useTopicList } from '../../topics/hooks';
import { analysisApi, type AnalysisResultRow } from '../api/analysis.api';
import { formatDateTime } from '../../../utils/format';

const { Text, Paragraph } = Typography;

const SENTIMENT_LABEL: Record<string, string> = {
  positive: '正面', neutral: '中性', negative: '负面', mixed: '混合', unclear: '含混',
};

const REVIEW_OPTIONS = [
  { value: 'pending', label: '待复核' },
  { value: 'confirmed', label: '已确认' },
  { value: 'uncertain', label: '存疑' },
  { value: 'rejected', label: '已驳回' },
];

const EXPORT_COLUMNS = [
  { header: '结果ID', value: (row: AnalysisResultRow) => row.id },
  { header: '评论ID', value: (row: AnalysisResultRow) => row.commentId },
  { header: '评论文本', value: (row: AnalysisResultRow) => row.commentText ?? '' },
  { header: '原帖摘要', value: (row: AnalysisResultRow) => row.postText ?? '' },
  { header: '规则', value: (row: AnalysisResultRow) => `${row.ruleId}@v${row.ruleVersion}` },
  { header: '相关性', value: (row: AnalysisResultRow) => row.relevance },
  { header: '反讽可能性', value: (row: AnalysisResultRow) => row.ironyProbability },
  { header: '情绪', value: (row: AnalysisResultRow) => row.sentiment },
  { header: '复核优先级', value: (row: AnalysisResultRow) => row.reviewPriority },
  { header: '标签', value: (row: AnalysisResultRow) => row.tags.join('|') },
  { header: '置信度', value: (row: AnalysisResultRow) => row.confidence },
  { header: '复核状态', value: (row: AnalysisResultRow) => row.reviewStatus },
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 220 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label} {value}
      </Text>
      <Progress percent={value} size="small" showInfo={false} />
    </div>
  );
}

export default function WorkbenchPage() {
  const { message } = App.useApp();
  const [detailId, setDetailId] = useState<string | null>(null);

  const listState = useListUrlState({
    filterKeys: ['reviewStatus', 'sentiment', 'ruleId', 'topicId', 'minPriority', 'minRelevance', 'minIrony'],
    allowedFilterValues: {
      reviewStatus: REVIEW_OPTIONS.map((o) => o.value),
      sentiment: ['positive', 'neutral', 'negative', 'mixed', 'unclear'],
    },
    defaultSort: { field: 'reviewPriority', order: 'desc' },
    allowedSortFields: ['relevance', 'ironyProbability', 'reviewPriority', 'confidence'],
    maxKeywordLength: 100,
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      keyword: listState.state.keyword || undefined,
      reviewStatus: listState.state.filters.reviewStatus || undefined,
      sentiment: listState.state.filters.sentiment || undefined,
      ruleId: listState.state.filters.ruleId || undefined,
      topicId: listState.state.filters.topicId || undefined,
      minPriority: listState.state.filters.minPriority ? Number(listState.state.filters.minPriority) : undefined,
      minRelevance: listState.state.filters.minRelevance ? Number(listState.state.filters.minRelevance) : undefined,
      minIrony: listState.state.filters.minIrony ? Number(listState.state.filters.minIrony) : undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = useAnalysisResults(queryParams);
  const { data: detail } = useAnalysisResult(detailId ?? '');
  const { data: rules } = useRules();
  const { data: topics } = useTopicList({ page: 1, pageSize: 100 });
  const submitReview = useSubmitReview();

  const { exportFiltered } = useDataExport<AnalysisResultRow>({
    moduleName: 'analysis-results',
    sheetName: '研判结果',
    columns: EXPORT_COLUMNS,
    getRows: async () => {
      const all: AnalysisResultRow[] = [];
      let page = 1;
      for (;;) {
        const response = await analysisApi.results({ ...queryParams, page, pageSize: 100 });
        all.push(...response.items);
        if (all.length >= response.total) break;
        page += 1;
      }
      return all;
    },
  });

  const columns = useMemo(
    () => [
      { title: '评论', dataIndex: 'commentText', key: 'commentText', ellipsis: true, render: (t: string | null) => <Text style={{ fontSize: 13 }}>{t ?? '—'}</Text> },
      {
        title: '相关性',
        dataIndex: 'relevance',
        key: 'relevance',
        width: 100,
        sorter: true,
        render: (v: number) => <ScoreBar label="" value={v} />,
      },
      {
        title: '反讽可能性',
        dataIndex: 'ironyProbability',
        key: 'ironyProbability',
        width: 110,
        sorter: true,
        render: (v: number) => <ScoreBar label="" value={v} />,
      },
      {
        title: '情绪',
        dataIndex: 'sentiment',
        key: 'sentiment',
        width: 80,
        render: (s: string) => <Tag>{SENTIMENT_LABEL[s] ?? s}</Tag>,
      },
      {
        title: '复核优先级',
        dataIndex: 'reviewPriority',
        key: 'reviewPriority',
        width: 110,
        sorter: true,
        render: (v: number) => <ScoreBar label="" value={v} />,
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        width: 160,
        render: (tags: string[]) => (
          <Space size={2} wrap>
            {tags.slice(0, 2).map((tag) => (
              <Tag key={tag} color="blue" style={{ fontSize: 11 }}>
                {tag}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '复核状态',
        dataIndex: 'reviewStatus',
        key: 'reviewStatus',
        width: 100,
        render: (status: string) => <StatusTag kind="review" value={status} />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        hideInSettings: true,
        render: (_: unknown, record: AnalysisResultRow) => (
          <Button size="small" type="link" onClick={() => setDetailId(record.id)}>
            详情
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <ListPageTemplate
      header={{
        title: '综合研判工作台',
        description: '多维评分、标签与依据聚合视图。评分为模拟输出，供人工复核参考，不代表发言者真实立场。',
      }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索评论文本 / 结果 ID"
          resultSummary={
            data ? (
              <Text type="secondary">
                {copy.table.total(data.total)} · 模拟评分 · {copy.common.demoMemory}
              </Text>
            ) : undefined
          }
          filters={
            <>
              <Select allowClear placeholder="复核状态" style={{ width: 120 }} value={listState.state.filters.reviewStatus} onChange={(v) => listState.setFilter('reviewStatus', v)} options={REVIEW_OPTIONS} aria-label="复核状态筛选" />
              <Select allowClear placeholder="情绪" style={{ width: 100 }} value={listState.state.filters.sentiment} onChange={(v) => listState.setFilter('sentiment', v)} options={Object.entries(SENTIMENT_LABEL).map(([value, label]) => ({ value, label }))} aria-label="情绪筛选" />
              <Select allowClear placeholder="规则" style={{ width: 160 }} value={listState.state.filters.ruleId} onChange={(v) => listState.setFilter('ruleId', v)} options={(rules?.items ?? []).map((rule) => ({ value: rule.id, label: `${rule.name} v${rule.version}` }))} aria-label="规则筛选" />
              <Select allowClear placeholder="专题" style={{ width: 160 }} value={listState.state.filters.topicId} onChange={(v) => listState.setFilter('topicId', v)} options={(topics?.items ?? []).map((topic) => ({ value: topic.id, label: topic.title }))} aria-label="专题筛选" />
              <Select
                allowClear
                placeholder="优先级下限"
                style={{ width: 120 }}
                value={listState.state.filters.minPriority}
                onChange={(v) => listState.setFilter('minPriority', v ? String(v) : undefined)}
                options={[40, 60, 75, 90].map((v) => ({ value: String(v), label: `≥ ${v}` }))}
                aria-label="优先级下限"
              />
            </>
          }
          actions={<ExportButton onExport={(format) => exportFiltered(format)} />}
        />
      }
    >
      <DataTable<AnalysisResultRow>
        tableId="analysis-workbench"
        tableLabel="研判结果列表"
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
        emptyDescription="尚无研判结果。请先在“AI 研判任务”创建并推进任务。"
      />

      <Drawer open={detailId !== null} onClose={() => setDetailId(null)} title="研判结果详情" width={640}>
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <DetailSection title="评论文本">
              <Paragraph>{detail.commentText}</Paragraph>
              <Text type="secondary">发布于 {formatDateTime(detail.commentPublishedAt)}</Text>
            </DetailSection>
            <DetailSection title="原帖上下文（公开模拟微博）">
              {detail.postText ? (
                <>
                  <Paragraph>{detail.postText}</Paragraph>
                  <Text type="secondary">
                    帖子 {detail.postId} · {formatDateTime(detail.postText ? detail.commentPublishedAt : null)}
                  </Text>
                </>
              ) : (
                <Text type="warning">缺少上下文：原帖缺失，评分置信度相应受限。</Text>
              )}
            </DetailSection>
            <DetailSection title="多维评分（模拟引擎输出）">
              <Space direction="vertical" style={{ width: '100%' }}>
                <ScoreBar label="话题相关性" value={detail.relevance} />
                <ScoreBar label="反讽表达可能性" value={detail.ironyProbability} />
                <ScoreBar label="复核优先级" value={detail.reviewPriority} />
                <Text type="secondary">置信度 {detail.confidence} · 情绪 {SENTIMENT_LABEL[detail.sentiment]}</Text>
                <Space size={4} wrap>
                  {detail.tags.map((tag) => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </DetailSection>
            <DetailSection title="分析依据与解释">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {detail.evidence.map((item, index) => (
                  <li key={index}>
                    <Text style={{ fontSize: 13 }}>{item}</Text>
                  </li>
                ))}
                {detail.evidence.length === 0 && <Text type="secondary">缺少上下文依据。</Text>}
              </ul>
              <Paragraph style={{ marginTop: 8 }}>{detail.explanation}</Paragraph>
              <Text type="secondary">
                规则 {detail.ruleId} v{detail.ruleVersion} · 任务 {detail.analysisTaskId} · 生成于 {formatDateTime(detail.createdAt)}
              </Text>
            </DetailSection>
            <ReviewDecisionForm
              currentStatus={detail.reviewStatus}
              history={detail.reviewHistory}
              submitting={submitReview.isPending}
              onSubmit={(status, note) =>
                submitReview.mutate(
                  { resultId: detail.id, status, note },
                  { onSuccess: () => message.success('复核结论已保存，历史记录已保留') },
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
