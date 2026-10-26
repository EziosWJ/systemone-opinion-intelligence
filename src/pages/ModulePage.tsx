import { Alert, Card, Space, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { matchRoute } from '../config/routes';
const { Title, Paragraph, Text } = Typography;
/** Intentional foundation placeholder; no fake operational buttons or mock success claims. */
export default function ModulePage() {
  const { pathname } = useLocation();
  const route = matchRoute(pathname);
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>{route?.title ?? '功能模块'}</Title>
        <Paragraph type="secondary">{route?.description ?? '此页面将按 V1 产品需求实施。'}</Paragraph>
      </div>
      <Card>
        <Alert
          type="info"
          showIcon
          message="工程基础阶段 · 功能尚未实现"
          description="这里已保留正式路由、导航与页面容器。真实可交互的采集、AI 研判、复核和报告能力会依照 docs/development-plan.md 分阶段实现。目前不提供虚构的执行结果。"
        />
        <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <Text type="secondary">对应需求请参阅 docs/prd-v1.md；数据与接口定义请参阅 docs/domain-model.md 和 docs/mock-api.md。</Text>
        </Paragraph>
      </Card>
    </Space>
  );
}