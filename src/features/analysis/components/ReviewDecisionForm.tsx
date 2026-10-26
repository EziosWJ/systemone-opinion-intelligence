import { useState } from 'react';
import { Alert, Button, Form, Input, Radio, Space, Typography } from 'antd';
import { DetailSection } from '../../../components/DetailFields/DetailFields';
import { StatusTag } from '../../../components/StatusTag/StatusTag';
import { formatDateTime } from '../../../utils/format';
import type { ReviewDecision } from '../../../types/entities';

const { Text } = Typography;

export interface ReviewDecisionFormProps {
  currentStatus: 'pending' | 'confirmed' | 'uncertain' | 'rejected';
  history: ReviewDecision[];
  submitting?: boolean;
  onSubmit: (status: 'confirmed' | 'uncertain' | 'rejected', note?: string) => void;
}

/** 人工复核：确认 / 存疑 / 驳回。决策追加写入，最新一条为当前态。 */
export function ReviewDecisionForm({ currentStatus, history, submitting, onSubmit }: ReviewDecisionFormProps) {
  const [status, setStatus] = useState<'confirmed' | 'uncertain' | 'rejected'>('confirmed');
  const [note, setNote] = useState('');

  return (
    <DetailSection title="人工复核">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <Text>当前状态：</Text>
          <StatusTag kind="review" value={currentStatus} />
        </Space>
        <Form layout="vertical" onFinish={() => onSubmit(status, note.trim() || undefined)}>
          <Form.Item label="复核结论" required>
            <Radio.Group
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: 'confirmed', label: '确认' },
                { value: 'uncertain', label: '存疑' },
                { value: 'rejected', label: '驳回' },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注（可选）">
            <Input.TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="记录复核理由或缺失的上下文" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            保存复核结论
          </Button>
        </Form>
        {history.length > 0 && (
          <div>
            <Text strong>历史复核记录（追加式，不可删除）</Text>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {history.map((decision) => (
                <li key={decision.id}>
                  <Space size={6}>
                    <StatusTag kind="review" value={decision.status} />
                    <Text type="secondary">{formatDateTime(decision.reviewedAt)}</Text>
                    {decision.note && <Text style={{ fontSize: 13 }}>{decision.note}</Text>}
                  </Space>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Alert
          type="info"
          showIcon
          message="复核结论用于研判质量跟踪，不用于推断发言者个人立场或建立个人画像。"
        />
      </Space>
    </DetailSection>
  );
}
