import { Alert, Card, Descriptions, Space, Tag, Typography } from 'antd';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { appConfig } from '../config/app.config';

const { Paragraph, Text } = Typography;

export default function SettingsPage() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader title="系统设置" description="演示环境说明与未来模型接入配置占位。" meta={<Tag color="blue">V1 演示</Tag>} />
      <Alert
        type="info"
        showIcon
        message="演示模式"
        description={`当前为 ${appConfig.name} V1 交互式演示。数据来自 MSW 内存模拟（刷新后重置），不连接真实爬虫、模型服务或数据库。`}
      />
      <Card title="环境信息">
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="运行模式">MSW Mock（内存态）</Descriptions.Item>
          <Descriptions.Item label="分析引擎">MockAnalysisEngine（确定性模拟评分）</Descriptions.Item>
          <Descriptions.Item label="数据规模">4 专题 / 300 微博 / 约 10,000 评论</Descriptions.Item>
          <Descriptions.Item label="身份模式">单用户（无登录 / 无权限体系）</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="模型接入（计划能力，未实现）">
        <Paragraph type="secondary">
          V1 定义了 <Text code>AnalysisEngine</Text> 接口缝（见 docs/architecture.md §6）。真实 JEV/大模型接入为后续独立里程碑，当前不提供配置入口，避免误导为可用能力。
        </Paragraph>
        <Alert type="warning" showIcon message="以下配置项为计划状态" description="模型 Endpoint、API Key、Prompt 策略与校验规则将在真实接入里程碑中提供。" />
      </Card>
    </Space>
  );
}
