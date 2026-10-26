import { useEffect, useState } from 'react';
import { Alert, Form, Input, Radio, Select, Typography, Upload } from 'antd';
import { UploadCloud } from 'lucide-react';
import { FormDrawer } from '../../../components/FormDrawer/FormDrawer';
import type { CreateCaptureTaskBody } from '../api/capture.api';
import type { TopicWithCounts } from '../../topics/api/topics.api';

const { Text } = Typography;

export interface CreateCaptureTaskValues extends CreateCaptureTaskBody {
  mode: 'url' | 'keyword' | 'import';
}

interface Props {
  open: boolean;
  topics: TopicWithCounts[];
  submitting?: boolean;
  error?: unknown;
  onClose: () => void;
  onSubmit: (values: CreateCaptureTaskBody) => void;
}

/** Three-entry capture creation: weibo URL / keyword / file import. Import
 * parses real CSV/XLSX/JSON files client-side (demo data only). */
export default function CreateCaptureTaskForm({ open, topics, submitting, error, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<CreateCaptureTaskValues>();
  const [mode, setMode] = useState<CreateCaptureTaskValues['mode']>('keyword');
  const [importedItems, setImportedItems] = useState<CreateCaptureTaskBody['items']>([]);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setMode('keyword');
      setImportedItems([]);
      setImportError(null);
    }
  }, [open, form]);

  const parseImportFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      let items: CreateCaptureTaskBody['items'] = [];
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) {
          items = parsed
            .map((entry) => (typeof entry === 'string' ? { text: entry } : (entry as { text?: string })))
            .filter((entry): entry is { text: string } => typeof entry.text === 'string' && entry.text.trim().length > 0);
        }
      } else {
        // CSV / TXT lines: first field or each line treated as post text.
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        const rows = lines.slice(file.name.endsWith('.csv') ? 1 : 0);
        items = rows
          .map((line) => {
            const firstCell = line.split(',')[0]?.replace(/^"|"$/g, '') ?? '';
            return { text: firstCell.trim() };
          })
          .filter((entry) => entry.text.length > 0);
      }
      if (!items?.length) {
        setImportError('未能从文件中解析出有效记录：请确认每行包含非空文本。');
        setImportedItems([]);
        return;
      }
      setImportedItems(items.slice(0, 100));
    } catch {
      setImportError('文件解析失败：请确认 JSON 或 CSV 格式正确。');
    }
  };

  return (
    <FormDrawer<CreateCaptureTaskValues>
      open={open}
      title="新建采集任务"
      description="演示环境不会发起任何真实网络请求；任务创建后通过“推进”按钮模拟执行。"
      form={form}
      onClose={onClose}
      submitting={submitting}
      error={error}
      submitText="创建任务"
      onFinish={(values) => {
        const body: CreateCaptureTaskBody =
          values.mode === 'import'
            ? { mode: 'import', items: importedItems, topicId: values.topicId }
            : { mode: values.mode, input: values.input, topicId: values.topicId };
        if (values.mode === 'import' && (!importedItems || importedItems.length === 0)) {
          setImportError('请先上传并成功解析文件。');
          return;
        }
        onSubmit(body);
      }}
    >
      <Form.Item name="mode" label="采集入口" initialValue="keyword" rules={[{ required: true }]}>
        <Radio.Group
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          options={[
            { value: 'keyword', label: '关键词采集' },
            { value: 'url', label: '微博链接' },
            { value: 'import', label: '文件导入' },
          ]}
        />
      </Form.Item>
      {mode === 'url' && (
        <Form.Item
          name="input"
          label="微博链接"
          rules={[
            { required: true, message: '请输入微博链接' },
            { pattern: /^https?:\/\/.+\..+/, message: '请输入合法的 http(s) 链接' },
          ]}
        >
          <Input placeholder="https://m.weibo.demo/status/123456" />
        </Form.Item>
      )}
      {mode === 'keyword' && (
        <Form.Item
          name="input"
          label="关键词 / 话题"
          rules={[
            { required: true, message: '请输入关键词' },
            { min: 2, message: '关键词至少 2 个字符' },
          ]}
        >
          <Input placeholder="例如：智慧社区" />
        </Form.Item>
      )}
      {mode === 'import' && (
        <Form.Item label="导入文件（CSV / JSON / TXT）" required>
          <Upload.Dragger
            accept=".csv,.json,.txt"
            maxCount={1}
            beforeUpload={(file) => {
              void parseImportFile(file);
              return false;
            }}
            showUploadList={{ showRemoveIcon: true }}
          >
            <p className="ant-upload-drag-icon"><UploadCloud size={32} /></p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">文件仅在浏览器本地解析，用于生成演示记录，不会上传到任何服务器。</p>
          </Upload.Dragger>
          {importError && <Alert type="error" showIcon message={importError} style={{ marginTop: 12 }} />}
          {importedItems && importedItems.length > 0 && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              已解析 {importedItems.length} 条记录（最多取前 100 条）
            </Text>
          )}
        </Form.Item>
      )}
      <Form.Item name="topicId" label="关联专题（可选）">
        <Select
          allowClear
          placeholder="选择要归入的专题"
          options={topics.map((topic) => ({ value: topic.id, label: topic.title }))}
        />
      </Form.Item>
    </FormDrawer>
  );
}
