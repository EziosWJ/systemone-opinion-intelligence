import { Alert, Card, Col, Row, Space, Steps, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
const { Title, Paragraph, Text } = Typography;
const modules = [
  { name: '数据采集', route: '/capture/tasks', detail: '链接、关键词、导入与采集任务管理' },
  { name: 'AI 研判', route: '/analysis/workbench', detail: '多维度评分、证据说明和批量分析' },
  { name: '人工复核', route: '/analysis/reviews', detail: '确认、存疑、驳回及操作留痕' },
  { name: '专题分析', route: '/topics', detail: '热点事件聚合与趋势分析' },
  { name: '报告中心', route: '/reports', detail: '专题简报编辑、预览与导出' },
];
export default function DashboardPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Space wrap><Title level={2} style={{ margin: 0 }}>舆情态势总览</Title><Tag color="blue">V1 基础工程</Tag></Space>
        <Paragraph type="secondary" style={{ marginTop: 8 }}>SystemOne · 社交媒体公开评论智能研判平台</Paragraph>
      </div>
      <Alert type="info" showIcon message="当前处于工程迁移与需求文档阶段"
        description="导航、主题、基础组件和测试框架可用；采集、分析、复核、专题和报告的业务流程尚待实现。此页面不展示虚构的业务统计。" />
      <Card title="V1 业务闭环规划">
        <Steps responsive size="small" items={[{ title: '采集' }, { title: 'AI 研判' }, { title: '人工复核' }, { title: '专题分析' }, { title: '报告交付' }]} current={0} />
      </Card>
      <Row gutter={[16,16]}>
        {modules.map((item) => (
          <Col key={item.route} xs={24} md={12} xl={8}>
            <Card title={<Link to={item.route}>{item.name}</Link>} style={{ height: '100%' }}>
              <Paragraph>{item.detail}</Paragraph>
              <Text type="secondary">状态：待开发</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}