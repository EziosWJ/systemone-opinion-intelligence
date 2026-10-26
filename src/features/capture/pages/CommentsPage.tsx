import { useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Tag, Typography } from 'antd';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { ExportButton } from '../../../components/ExportButton/ExportButton';
import { DetailFields, DetailSection } from '../../../components/DetailFields/DetailFields';
import { copy } from '../../../config/copy';
import { useDataExport } from '../../../hooks/useDataExport';
import { useCommentDetail, useCommentList } from '../../capture/hooks';
import { formatDateTime } from '../../../utils/format';
import dayjs, { type Dayjs } from 'dayjs';
import { commentsApi, type CommentListItem } from '../api/comments.api';

const { Text, Paragraph } = Typography;

const EXPORT_COLUMNS = [
  { header: 'ID', value: (row: CommentListItem) => row.id },
  { header: '帖子ID', value: (row: CommentListItem) => row.postId },
  { header: '评论内容', value: (row: CommentListItem) => row.text },
  { header: '原帖摘要', value: (row: CommentListItem) => row.postText ?? '' },
  { header: '发布时间', value: (row: CommentListItem) => row.publishedAt },
  { header: '采集时间', value: (row: CommentListItem) => row.collectedAt },
];

export default function CommentsPage() {
  const [detailId, setDetailId] = useState<string | null>(null);

  const listState = useListUrlState({
    filterKeys: ['postId'],
    defaultSort: { field: 'publishedAt', order: 'desc' },
    allowedSortFields: ['publishedAt'],
    dateFilterKeys: ['from', 'to'],
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      keyword: listState.state.keyword || undefined,
      postId: listState.state.filters.postId || undefined,
      from: listState.state.filters.from || undefined,
      to: listState.state.filters.to || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = useCommentList(queryParams);
  const { data: detail } = useCommentDetail(detailId ?? '');

  const { exportFiltered } = useDataExport<CommentListItem>({
    moduleName: 'comments',
    sheetName: '评论数据',
    columns: EXPORT_COLUMNS,
    getRows: async () => {
      const all: CommentListItem[] = [];
      let page = 1;
      for (;;) {
        const response = await commentsApi.list({ ...queryParams, page, pageSize: 100 });
        all.push(...response.items);
        if (all.length >= response.total) break;
        page += 1;
      }
      return all;
    },
  });

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 110 },
      {
        title: '评论内容',
        dataIndex: 'text',
        key: 'text',
        ellipsis: true,
        render: (text: string) => <Text style={{ fontSize: 13 }}>{text}</Text>,
      },
      {
        title: '原帖摘要',
        dataIndex: 'postText',
        key: 'postText',
        ellipsis: true,
        width: 220,
        render: (text: string | null) => <Text type="secondary">{text ? text.slice(0, 40) : '—'}</Text>,
      },
      { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 160, render: formatDateTime, sorter: true },
      { title: '采集时间', dataIndex: 'collectedAt', key: 'collectedAt', width: 160, render: formatDateTime },
      {
        title: '操作',
        key: 'actions',
        width: 90,
        hideInSettings: true,
        render: (_: unknown, record: CommentListItem) => (
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
      header={{ title: '评论数据', description: `${copy.table.total(data?.total ?? 0)} 条模拟评论。行详情展示评论原文、关联原帖与发布时间。` }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索评论内容 / ID"
          resultSummary={
            data ? (
              <Text type="secondary">
                {copy.table.total(data.total)} · {copy.common.demoMemory}
                {listState.state.filters.postId && <Tag style={{ marginLeft: 8 }}>帖子 {listState.state.filters.postId}</Tag>}
              </Text>
            ) : undefined
          }
          filters={
            <>
              <DatePicker.RangePicker
                value={[
                  listState.state.filters.from ? dayjs(listState.state.filters.from) : null,
                  listState.state.filters.to ? dayjs(listState.state.filters.to) : null,
                ] as [Dayjs | null, Dayjs | null]}
                onChange={(dates) => {
                  const [from, to] = dates ?? [null, null];
                  listState.setFilters({
                    from: from?.format('YYYY-MM-DD'),
                    to: to?.format('YYYY-MM-DD'),
                  });
                }}
                allowEmpty={[true, true]}
                aria-label="发布日期范围"
              />
              <Text type="secondary" style={{ alignSelf: 'center' }}>
                可按发布日期与原帖 ID 过滤，数据规模 10k 条。
              </Text>
            </>
          }
          actions={<ExportButton onExport={(format) => exportFiltered(format)} />}
        />
      }
    >
      <DataTable<CommentListItem>
        tableId="capture-comments"
        tableLabel="评论数据列表"
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
        emptyDescription="调整筛选条件或从微博内容库进入关联评论。"
      />
      <Drawer open={detailId !== null} onClose={() => setDetailId(null)} title="评论详情" width={560}>
        {detail ? (
          <DetailSection title="评论文本">
            <Paragraph>{detail.text}</Paragraph>
          </DetailSection>
        ) : (
          <Text type="secondary">加载中…</Text>
        )}
        {detail && (
          <DetailSection title="字段">
            <DetailFields
              column={1}
              items={[
                { key: 'id', label: '评论 ID', children: detail.id },
                { key: 'postId', label: '原帖 ID', children: detail.postId },
                { key: 'publishedAt', label: '发布时间', children: formatDateTime(detail.publishedAt) },
                { key: 'collectedAt', label: '采集时间', children: formatDateTime(detail.collectedAt) },
              ]}
            />
          </DetailSection>
        )}
        {detail?.post && (
          <DetailSection title="原帖上下文（公开模拟微博）">
            <Paragraph>{detail.post.text}</Paragraph>
            <Text type="secondary">
              发布于 {formatDateTime(detail.post.publishedAt)} ·{' '}
              <a href={detail.post.url} target="_blank" rel="noreferrer noopener">
                模拟链接
              </a>
            </Text>
          </DetailSection>
        )}
        {detail && !detail.post && (
          <DetailSection title="原帖上下文">
            <Text type="warning">原帖已缺失或删除，无法展示上下文。</Text>
          </DetailSection>
        )}
      </Drawer>
    </ListPageTemplate>
  );
}
