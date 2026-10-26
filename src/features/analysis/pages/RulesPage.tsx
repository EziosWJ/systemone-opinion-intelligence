import { useMemo, useState } from 'react';
import { App, Button, Drawer, Form, Input, Space, Table, Tag, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { EmptyState } from '../../../components/AsyncState/AsyncState';
import { copy } from '../../../config/copy';
import { useCreateRule, useRules } from '../hooks';
import type { AnalysisRule } from '../../../types/entities';

const { Text, Paragraph } = Typography;

export default function RulesPage() {
  const { message } = App.useApp();
  const { data, isLoading, isError, error, refetch } = useRules();
  const createRule = useCreateRule();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ name: string; promptTemplate?: string }>();

  const columns = useMemo(
    () => [
      { title: '规则 ID', dataIndex: 'id', key: 'id', width: 140 },
      { title: '名称', dataIndex: 'name', key: 'name', width: 220 },
      { title: '版本', dataIndex: 'version', key: 'version', width: 80, render: (v: number) => <Tag>v{v}</Tag> },
      {
        title: '评分维度',
        dataIndex: 'dimensions',
        key: 'dimensions',
        render: (dims: string[]) => (
          <Space size={4} wrap>
            {dims.map((dim) => (
              <Tag key={dim} color="blue">
                {dim}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '提示模板',
        dataIndex: 'promptTemplate',
        key: 'promptTemplate',
        ellipsis: true,
        render: (text: string) => <Text type="secondary">{text}</Text>,
      },
      { title: '输出 Schema', dataIndex: 'outputSchemaVersion', key: 'outputSchemaVersion', width: 120 },
    ],
    [],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="研判规则"
        description="规则模板与评分维度配置。规则版本一经执行不可原位覆盖；新建同名规则会生成新版本。"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            新建规则
          </Button>
        }
      />
      <Table<AnalysisRule>
        rowKey={(rule) => `${rule.id}:${rule.version}`}
        columns={columns as never}
        dataSource={data?.items ?? []}
        loading={isLoading}
        locale={{
          emptyText: isError ? (
            <EmptyState title={copy.common.loadFailed} description={String(error)} action={<Button onClick={() => refetch()}>重试</Button>} />
          ) : (
            <EmptyState />
          ),
        }}
        pagination={false}
      />
      <Drawer
        open={open}
        title="新建规则模板"
        width={480}
        onClose={() => setOpen(false)}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" loading={createRule.isPending} onClick={() => form.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary">演示环境使用确定性模拟评分引擎；规则模板用于约束评分维度与解释口径。</Paragraph>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            createRule.mutate(values, {
              onSuccess: (rule) => {
                message.success(`规则 ${rule.name} v${rule.version} 已保存`);
                setOpen(false);
                form.resetFields();
              },
            })
          }
        >
          <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="例如：评论情绪预筛规则" />
          </Form.Item>
          <Form.Item name="promptTemplate" label="提示模板（可选）">
            <Input.TextArea rows={4} placeholder="描述该规则的评分侧重点（仅用于展示，模拟引擎不调用真实模型）" />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
