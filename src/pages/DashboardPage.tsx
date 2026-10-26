import { useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Segmented, Space, Statistic, Tag, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { Area, Pie } from '@ant-design/charts';
import { useDashboardSummary } from '../features/dashboard/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState/AsyncState';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { copy } from '../config/copy';
import { formatNumber } from '../utils/format';

const { Text } = Typography;

const RANGES = [
  { value: '7d', label: '近 7 天' },
  { value: '14d', label: '近 14 天' },
  { value: '30d', label: '近 30 天' },
];

const SENTIMENT_LABEL: Record<string, string> = {
  positive: '正面', neutral: '中性', negative: '负面', mixed: '混合', unclear: '含混',
};

export default function DashboardPage() {
  const [range, setRange] = useState('7d');
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useDashboardSummary(range);

  const trendData = useMemo(
    () => (data?.trend ?? []).flatMap((point) => [
      { day: point.day.slice(5), value: point.collected, type: '采集评论' },
      { day: point.day.slice(5), value: point.analyzed, type: '已研判' },
    ]),
    [data],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="舆情态势总览"
        description="采集、研判、复核与专题的综合态势。所有指标来自 MSW 内存聚合接口，与业务列表同源。"
        extra={<Segmented value={range} onChange={(value) => setRange(value as string)} options={RANGES} />}
        meta={<Tag color="blue">演示数据 · {copy.common.demoMemory}</Tag>}
      />

      <Alert
        type="info"
        showIcon
        message="V1 演示环境"
        description="所有数据由确定性种子生成，评分来自模拟分析引擎（MockAnalysisEngine），不调用真实模型或外部采集。"
      />

      {isLoading && <LoadingState rows={6} />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {data && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => navigate('/capture/comments')}>
                <Statistic title="采集评论总量" value={formatNumber(data.kpi.totalComments)} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  微博 {formatNumber(data.kpi.totalPosts)} 条 · {range} 内新增 {formatNumber(data.kpi.commentsInRange)}
                </Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => navigate('/analysis/workbench')}>
                <Statistic title="已研判评论" value={formatNumber(data.kpi.analyzedComments)} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  模拟评分，去重统计
                </Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => navigate('/analysis/reviews')}>
                <Statistic title="待复核" value={formatNumber(data.kpi.pendingReviews)} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  含存疑（uncertain）
                </Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => navigate('/capture/tasks')}>
                <Statistic
                  title="采集任务"
                  value={data.kpi.activeCaptureTasks}
                  suffix={`/ ${data.kpi.totalCaptureTasks}`}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  活跃 / 总数 · 分析任务 {data.kpi.analysisTasks}
                </Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title="采集与研判趋势（按评论发布日期）" extra={<Text type="secondary">口径：publishedAt</Text>}>
                {trendData.length ? (
                  <Area
                    data={trendData}
                    xField="day"
                    yField="value"
                    seriesField="type"
                    height={280}
                    tooltip={{ title: '日期' }}
                  />
                ) : (
                  <EmptyState description="当前区间暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="情绪分布（模拟研判结果）">
                {data.sentiment.length ? (
                  <Pie
                    data={data.sentiment.map((item) => ({ ...item, label: SENTIMENT_LABEL[item.sentiment] ?? item.sentiment }))}
                    angleField="count"
                    colorField="label"
                    height={280}
                    innerRadius={0.5}
                    label={{ type: 'outer' }}
                  />
                ) : (
                  <EmptyState description="尚无研判数据。请先在 AI 研判任务中创建并推进任务。" />
                )}
              </Card>
            </Col>
          </Row>

          <Card title="热点专题排名（按关联评论数）" extra={<Link to="/topics">进入专题分析</Link>}>
            {data.topicRanking.length ? (
              data.topicRanking.map((topic, index) => (
                <div
                  key={topic.topicId}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}
                >
                  <Text strong style={{ width: 28 }}>
                    {index + 1}
                  </Text>
                  <Link to={`/topics/${topic.topicId}`} style={{ flex: 1 }}>
                    {topic.title}
                  </Link>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    评论 {formatNumber(topic.commentCount)} · 已研判 {formatNumber(topic.analyzedCount)}
                  </Text>
                  <Link to={`/capture/comments?topicId=${encodeURIComponent(topic.topicId)}`}>
                    <Text style={{ fontSize: 12 }}>查看评论</Text>
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState />
            )}
          </Card>

          <Alert
            type="warning"
            showIcon
            message="指标口径说明"
            description="待复核 = 存在有效分析结果且未有最终 confirmed/rejected 决策（存 uncertain）；已研判 = 有至少一条完成结果的唯一评论数；专题热度按专题关联评论在日粒度聚合。模拟评分不用于推断个人政治立场或风险。"
          />
        </>
      )}
    </Space>
  );
}
