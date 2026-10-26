import { useEffect, useState } from 'react';
import { App, Alert, Button, Descriptions, Input, Segmented, Space, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Eye, Pencil, Save } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { LoadingState, ErrorState } from '../../../components/AsyncState/AsyncState';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { useExportReport, useReportDetail, useUpdateReport } from '../hooks';
import { useTopicDetail } from '../../topics/hooks';
import { formatDateTime } from '../../../utils/format';

const { Text, Paragraph, Title } = Typography;

/** Minimal Markdown rendering for report preview (headings, quotes, lists, paragraphs). */
function MarkdownPreview({ source }: { source: string }) {
  const blocks = source.split('\n');
  return (
    <div>
      {blocks.map((line, index) => {
        if (line.startsWith('# ')) return <Title key={index} level={3}>{line.slice(2)}</Title>;
        if (line.startsWith('## ')) return <Title key={index} level={4} style={{ marginTop: 16 }}>{line.slice(3)}</Title>;
        if (line.startsWith('> ')) {
          return (
            <Paragraph key={index} style={{ borderLeft: '3px solid #2563eb', paddingLeft: 12, background: '#f5f7ff', borderRadius: 4 }}>
              {line.slice(2)}
            </Paragraph>
          );
        }
        if (line.startsWith('- ')) return <Paragraph key={index} style={{ margin: 0, paddingLeft: 16 }}>• {line.slice(2)}</Paragraph>;
        if (!line.trim()) return <div key={index} style={{ height: 8 }} />;
        return <Paragraph key={index}>{line}</Paragraph>;
      })}
    </div>
  );
}

export default function ReportDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: report, isLoading, isError, error, refetch } = useReportDetail(id);
  const { data: topic } = useTopicDetail(report?.topicId ?? '');
  const updateReport = useUpdateReport();
  const exportReport = useExportReport();
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (report) setDraft(report.contentMarkdown);
  }, [report]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!report) return <ErrorState error={{ message: '报告不存在' }} onRetry={() => navigate('/reports')} />;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title={report.title}
        description={`生成于 ${formatDateTime(report.generatedAt)} · 最后更新 ${formatDateTime(report.updatedAt)}`}
        extra={
          <Space>
            <Segmented
              value={mode}
              onChange={(value) => setMode(value as 'preview' | 'edit')}
              options={[
                { value: 'preview', label: '预览', icon: <Eye size={14} /> },
                { value: 'edit', label: '编辑', icon: <Pencil size={14} /> },
              ]}
            />
            {mode === 'edit' && (
              <Button
                type="primary"
                icon={<Save size={15} />}
                loading={updateReport.isPending}
                onClick={() =>
                  updateReport.mutate(
                    { id: report.id, contentMarkdown: draft, status: 'ready' },
                    { onSuccess: () => message.success('报告已保存（导出以保存内容为准）') },
                  )
                }
              >
                保存
              </Button>
            )}
            <Button
              icon={<Download size={15} />}
              loading={exportReport.isPending}
              onClick={() =>
                exportReport.mutate(report.id, {
                  onSuccess: () => message.success('HTML 文件已下载'),
                  onError: (err) => message.error(`导出失败：${String(err)}`),
                })
              }
            >
              导出 HTML
            </Button>
          </Space>
        }
        meta={<StatusTag kind="report" value={report.status} />}
      />

      <Alert
        type="info"
        showIcon
        message="演示报告：内容基于模拟数据快照生成；评分为模拟引擎输出，不构成对真实舆论或个人立场的判断。"
      />

      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="关联专题">
          <Link to={`/topics/${report.topicId}`}>{topic?.title ?? report.topicId}</Link>
        </Descriptions.Item>
        <Descriptions.Item label="快照评论数">{report.snapshot.totalComments}</Descriptions.Item>
        <Descriptions.Item label="快照已研判数">{report.snapshot.analyzedComments}</Descriptions.Item>
        <Descriptions.Item label="规则版本">{report.snapshot.ruleVersions?.join('、') || '—'}</Descriptions.Item>
        <Descriptions.Item label="快照生成时间" span={2}>
          {formatDateTime(report.snapshot.generatedAt)}
        </Descriptions.Item>
      </Descriptions>

      {mode === 'preview' ? (
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 24 }}>
          <MarkdownPreview source={report.contentMarkdown} />
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text type="secondary">编辑 Markdown 正文；保存后预览与导出均使用已保存内容。</Text>
          <Input.TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={24}
            aria-label="报告正文编辑"
            style={{ fontFamily: 'monospace' }}
          />
        </Space>
      )}
    </Space>
  );
}
