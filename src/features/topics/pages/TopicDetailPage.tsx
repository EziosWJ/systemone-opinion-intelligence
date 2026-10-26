import { useMemo, useState } from 'react';
import { App, Button, Card, Col, Drawer, Form, Input, Row, Space, Statistic, Tag, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { Line, Pie } from '@ant-design/charts';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { LoadingState, ErrorState } from '../../../components/AsyncState/AsyncState';
import { useLinkTopicComments, useTopicDetail, useTopicInsights } from '../hooks';
import { useCommentList } from '../../capture/hooks';
import { useCreateReport } from '../../reports/hooks';
import { formatDateTime } from '../../../utils/format';

const { Text, Paragraph } = Typography;

export default function TopicDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [linkOpen, setLinkOpen] = useState(false);
  const [form] = Form.useForm<{ commentIds: string }>();

  const { data: topic, isLoading, isError, error, refetch } = useTopicDetail(id);
  const { data: insights } = useTopicInsights(id);
  const createReport = useCreateReport();
  const linkComments = useLinkTopicComments();
  const { data: recentComments } = useCommentList({ page: 1, pageSize: 20, topicId: id });

  const trendData = useMemo(
    () => (insights?.trend ?? []).map((point) => ({ day: point.day.slice(5), count: point.collected })),
    [insights],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!topic) return <ErrorState error={{ message: '专题不存在' }} onRetry={() => navigate('/topics')} />;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title={topic.title}
        description={topic.summary || '暂无摘要'}
        extra={
          <Space>
            <Button icon={<Plus size={15} />} onClick={() => setLinkOpen(true)}>
              关联评论
            </Button>
            <Button
              type="primary"
              icon={<FileText size={15} />}
              loading={createReport.isPending}
              onClick={() =>
                createReport.mutate(
                  { topicId: topic.id },
                  {
                    onSuccess: (report) => {
                      message.success('报告已生成（含数据快照与不确定性说明）');
                      navigate(`/reports/${report.id}`);
                    },
                  },
                )
              }
            >
              生成报告
            </Button>
          </Space>
        }
        meta={
          <Space size={8} wrap>
            {topic.keywords.map((keyword) => (
              <Tag key={keyword}>{keyword}</Tag>
            ))}
            <Text type="secondary">
              创建于 {formatDateTime(topic.createdAt)} · 微博 {topic.postCount} 条 · 评论 {topic.commentCount} 条
            </Text>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="关联评论" value={insights?.totalComments ?? topic.commentCount} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="已研判" value={insights?.analyzedComments ?? 0} suffix={`/ ${insights?.totalComments ?? 0}`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="待复核" value={insights?.pendingReviews ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="研判覆盖率"
              value={insights && insights.totalComments ? Math.round((insights.analyzedComments / insights.totalComments) * 100) : 0}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="评论热度趋势（按发布日期）">
            {trendData.length ? (
              <Line
                data={trendData}
                xField="day"
                yField="count"
                height={260}
                point={{ size: 3 }}
                tooltip={{ title: '日期' }}
              />
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="情绪分布（模拟研判）">
            {insights?.sentimentDistribution.length ? (
              <Pie
                data={insights.sentimentDistribution}
                angleField="count"
                colorField="label"
                height={260}
                innerRadius={0.5}
                label={{ type: 'outer' }}
              />
            ) : (
              <Text type="secondary">尚无研判数据。请先在 AI 研判任务中执行分析。</Text>
            )}
          </Card>
        </Col>
      </Row>

      {insights && insights.tagDistribution.length > 0 && (
        <Card title="观点标签分布（Top 12，模拟评分）">
          <Space size={8} wrap>
            {insights.tagDistribution.map((item) => (
              <Tag key={item.tag} color="blue">
                {item.tag}（{item.count}）
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {insights && insights.representative.length > 0 && (
        <Card title="代表性评论（按复核优先级，模拟评分）">
          {insights.representative.map((item) => (
            <div key={item.commentId} style={{ borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
              <Paragraph style={{ marginBottom: 4 }}>{item.text}</Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                评论 {item.commentId} · {item.publishedAt.slice(0, 10)} · 相关性 {item.relevance} · 反讽可能性 {item.ironyProbability} ·{' '}
                <Link to={`/analysis/workbench?keyword=${encodeURIComponent(item.text.slice(0, 10))}`}>在工作台查看</Link>
              </Text>
              {item.postText && (
                <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  原帖：{item.postText.slice(0, 50)}…
                </Paragraph>
              )}
            </div>
          ))}
        </Card>
      )}

      <Card
        title="专题评论（按发布时间倒序）"
        extra={
          <Link to={`/capture/comments?topicId=${encodeURIComponent(topic.id)}`}>
            <Button size="small" type="link">
              查看全部评论
            </Button>
          </Link>
        }
      >
        {(recentComments?.items ?? []).map((comment) => (
          <div key={comment.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
            <Text style={{ fontSize: 13 }}>{comment.text}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {comment.id} · {formatDateTime(comment.publishedAt)}
              </Text>
            </div>
          </div>
        ))}
        {recentComments?.items.length === 0 && <Text type="secondary">暂无关联评论</Text>}
      </Card>

      <Drawer open={linkOpen} title="关联评论到专题" width={480} onClose={() => setLinkOpen(false)}>
        <Paragraph type="secondary">
          输入要关联的评论 ID（逗号分隔）。关联后专题统计与报告快照会实时更新。可从评论数据列表复制 ID。
        </Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const ids = values.commentIds
              .split(/[,，\s]+/)
              .map((v) => v.trim())
              .filter(Boolean);
            linkComments.mutate(
              { id: topic.id, commentIds: ids },
              {
                onSuccess: (data) => {
                  message.success(`已关联 ${data.linked} 条评论`);
                  setLinkOpen(false);
                  form.resetFields();
                },
              },
            );
          }}
        >
          <Form.Item name="commentIds" label="评论 ID 列表" rules={[{ required: true, message: '请输入至少一个评论 ID' }]}>
            <Input.TextArea rows={4} placeholder="cmt_00001, cmt_00002" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={linkComments.isPending} style={{ float: 'right' }}>
            关联
          </Button>
        </Form>
      </Drawer>
    </Space>
  );
}
