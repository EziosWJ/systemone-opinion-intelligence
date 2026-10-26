import { useMemo } from 'react';
import { Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useListUrlState } from '../../../hooks/useListUrlState';
import { SearchFilterBar } from '../../../components/SearchFilterBar/SearchFilterBar';
import { ListPageTemplate } from '../../../components/templates/ListPageTemplate';
import { DataTable } from '../../../components/DataTable/DataTable';
import { ExportButton } from '../../../components/ExportButton/ExportButton';
import { copy } from '../../../config/copy';
import { useDataExport } from '../../../hooks/useDataExport';
import { usePostList } from '../../capture/hooks';
import { useTopicList } from '../../topics/hooks';
import { formatDateTime } from '../../../utils/format';
import { Select } from 'antd';
import type { PostWithCount } from '../api/posts.api';

const { Text } = Typography;

const EXPORT_COLUMNS = [
  { header: 'ID', value: (row: PostWithCount) => row.id },
  { header: '平台', value: (row: PostWithCount) => row.platform },
  { header: '来源ID', value: (row: PostWithCount) => row.sourceId },
  { header: '正文', value: (row: PostWithCount) => row.text },
  { header: '链接', value: (row: PostWithCount) => row.url },
  { header: '发布时间', value: (row: PostWithCount) => row.publishedAt },
  { header: '评论数', value: (row: PostWithCount) => row.commentCount },
];

export default function PostsPage() {
  const listState = useListUrlState({
    filterKeys: ['topicId'],
    defaultSort: { field: 'publishedAt', order: 'desc' },
    allowedSortFields: ['publishedAt', 'commentCount'],
    dateFilterKeys: ['from', 'to'],
  });

  const queryParams = useMemo(
    () => ({
      page: listState.state.page,
      pageSize: listState.state.pageSize,
      keyword: listState.state.keyword || undefined,
      topicId: listState.state.filters.topicId || undefined,
      from: listState.state.filters.from || undefined,
      to: listState.state.filters.to || undefined,
      sortBy: listState.state.sortBy,
      sortOrder: listState.state.sortOrder,
    }),
    [listState.state],
  );

  const { data, isLoading, isError, error, refetch } = usePostList(queryParams);
  const { data: topics } = useTopicList({ page: 1, pageSize: 100 });
  const { exportFiltered } = useDataExport<PostWithCount>({
    moduleName: 'weibo-posts',
    sheetName: '微博内容',
    columns: EXPORT_COLUMNS,
    getRows: async () => {
      const all: PostWithCount[] = [];
      let page = 1;
      // Server caps at 100 per page; walk all pages for full filtered export.
      for (;;) {
        const response = await (await import('../api/posts.api')).postsApi.list({ ...queryParams, page, pageSize: 100 });
        all.push(...response.items);
        if (all.length >= response.total) break;
        page += 1;
      }
      return all;
    },
  });

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
      {
        title: '正文',
        dataIndex: 'text',
        key: 'text',
        ellipsis: true,
        render: (text: string, record: PostWithCount) => (
          <Link to={`/capture/comments?postId=${encodeURIComponent(record.id)}`} title={text}>
            {text.slice(0, 60)}
          </Link>
        ),
      },
      {
        title: '专题',
        key: 'topicIds',
        width: 180,
        render: (_: unknown, record: PostWithCount) => (
          <>
            {record.topicIds.map((topicId) => {
              const topic = topics?.items.find((item) => item.id === topicId);
              return topic ? <Tag key={topicId}>{topic.title.slice(0, 10)}</Tag> : null;
            })}
          </>
        ),
      },
      { title: '评论数', dataIndex: 'commentCount', key: 'commentCount', width: 90, sorter: true },
      { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 160, render: formatDateTime, sorter: true },
      {
        title: '来源',
        key: 'source',
        width: 120,
        render: (_: unknown, record: PostWithCount) => <Text type="secondary">{record.sourceId}</Text>,
      },
    ],
    [topics],
  );

  return (
    <ListPageTemplate
      header={{ title: '微博内容库', description: '公开模拟微博正文。点击正文进入关联评论视图；全部数据来自 MSW 内存种子。' }}
      filterBar={
        <SearchFilterBar
          keyword={listState.keywordDraft}
          onKeywordChange={listState.setKeywordDraft}
          onSearch={() => listState.submitSearch()}
          onReset={() => listState.reset()}
          loading={isLoading}
          placeholder="搜索正文内容 / ID"
          resultSummary={
            data ? <Text type="secondary">{copy.table.total(data.total)} · {copy.common.demoMemory}</Text> : undefined
          }
          filters={
            <>
              <Select
                allowClear
                placeholder="专题"
                style={{ width: 200 }}
                value={listState.state.filters.topicId}
                onChange={(value) => listState.setFilter('topicId', value)}
                options={(topics?.items ?? []).map((topic) => ({ value: topic.id, label: topic.title }))}
                aria-label="专题筛选"
              />
            </>
          }
          actions={<ExportButton onExport={(format) => exportFiltered(format)} />}
        />
      }
    >
      <DataTable<PostWithCount>
        tableId="capture-posts"
        tableLabel="微博内容列表"
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
      />
    </ListPageTemplate>
  );
}
