import { useEffect, useRef, useState } from 'react';
import { App, Button, Progress, Space, Typography, Upload } from 'antd';
import { CircleAlert, CircleCheck, FileText, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { copy } from '../../config/copy';
import styles from './MockUpload.module.css';

export interface MockUploadProps {
  accept?: string;
  maxSizeMB?: number;
  maxCount?: number;
  onPreview?: (file: File) => void | Promise<void>;
  disabled?: boolean;
}

interface MockUploadItem {
  uid: string;
  file: File;
  status: 'uploading' | 'done' | 'error';
  percent: number;
  error?: string;
}

let uidSeed = 0;

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

/**
 * Demo-only uploader. Files never leave the browser: progress and failures are
 * simulated deterministically, and no business data is written.
 */
export function MockUpload({
  accept = '.csv,.xlsx',
  maxSizeMB = 5,
  maxCount = 3,
  onPreview,
  disabled,
}: MockUploadProps) {
  const { message } = App.useApp();
  const [items, setItems] = useState<MockUploadItem[]>([]);
  const itemsRef = useRef<MockUploadItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const allowedExtensions = accept
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) window.clearInterval(timer);
      activeTimers.clear();
    };
  }, []);

  const updateItem = (uid: string, patch: Partial<MockUploadItem>) => {
    setItems((current) => current.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  };

  const startSimulation = (uid: string, file: File) => {
    const existing = timers.current.get(uid);
    if (existing) window.clearInterval(existing);
    updateItem(uid, { status: 'uploading', percent: 0, error: undefined });

    const timer = window.setInterval(() => {
      setItems((current) => {
        const target = current.find((item) => item.uid === uid);
        if (!target || target.status !== 'uploading') return current;
        const nextPercent = Math.min(100, target.percent + 20);
        if (nextPercent < 100) {
          return current.map((item) => (item.uid === uid ? { ...item, percent: nextPercent } : item));
        }
        window.clearInterval(timer);
        timers.current.delete(uid);
        const shouldFail = file.name.toLowerCase().includes('fail');
        return current.map((item) =>
          item.uid === uid
            ? {
                ...item,
                percent: 100,
                status: shouldFail ? 'error' : 'done',
                error: shouldFail ? copy.upload.failure : undefined,
              }
            : item,
        );
      });
    }, 180);
    timers.current.set(uid, timer);
  };

  const addFile = (file: File) => {
    if (itemsRef.current.length >= maxCount) {
      message.warning(copy.upload.tooMany(maxCount));
      return;
    }
    if (!allowedExtensions.includes(extensionOf(file.name))) {
      message.error(copy.upload.unsupportedType(accept));
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      message.error(copy.upload.tooLarge(maxSizeMB));
      return;
    }
    uidSeed += 1;
    const item: MockUploadItem = {
      uid: `mock-upload-${uidSeed}`,
      file,
      status: 'uploading',
      percent: 0,
    };
    setItems((current) => [...current, item]);
    itemsRef.current = [...itemsRef.current, item];
    startSimulation(item.uid, file);
  };

  const removeItem = (uid: string) => {
    const timer = timers.current.get(uid);
    if (timer) window.clearInterval(timer);
    timers.current.delete(uid);
    setItems((current) => current.filter((item) => item.uid !== uid));
  };

  return (
    <div className={styles.wrapper}>
      <Upload.Dragger
        accept={accept}
        multiple
        maxCount={maxCount}
        showUploadList={false}
        disabled={disabled}
        beforeUpload={(file) => {
          addFile(file);
          return false;
        }}
        className={styles.dragger}
        aria-label={copy.upload.selectLabel}
      >
        <p className={styles.icon}>
          <UploadCloud size={30} />
        </p>
        <p className={styles.title}>{copy.upload.dropTitle}</p>
        <p className={styles.hint}>{copy.upload.hint(accept, maxSizeMB, maxCount)}</p>
      </Upload.Dragger>

      <Typography.Paragraph type="secondary" className={styles.notice}>
        {copy.upload.noticeBefore}
        <Typography.Text code>fail</Typography.Text>
        {copy.upload.noticeAfter}
      </Typography.Paragraph>

      {items.length > 0 && (
        <ul className={styles.list} aria-label={copy.upload.listLabel}>
          {items.map((item) => (
            <li key={item.uid} className={styles.item}>
              <div className={styles.itemMain}>
                <Space size={8}>
                  <FileText size={16} aria-hidden="true" />
                  <Typography.Text className={styles.fileName}>{item.file.name}</Typography.Text>
                  <Typography.Text type="secondary" className={styles.size}>
                    {(item.file.size / 1024).toFixed(1)} KB
                  </Typography.Text>
                </Space>
                {item.status === 'done' && (
                  <Space size={4} className={styles.done}>
                    <CircleCheck size={15} aria-hidden="true" />
                    <Typography.Text type="success">{copy.upload.success}</Typography.Text>
                  </Space>
                )}
                {item.status === 'error' && (
                  <Space size={4} className={styles.failed}>
                    <CircleAlert size={15} aria-hidden="true" />
                    <Typography.Text type="danger">{item.error}</Typography.Text>
                  </Space>
                )}
              </div>
              {item.status === 'uploading' && (
                <Progress
                  percent={item.percent}
                  size="small"
                  status="active"
                  aria-label={copy.upload.progress(item.file.name)}
                />
              )}
              <Space size={4} className={styles.actions}>
                {item.status === 'done' && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      if (onPreview) void onPreview(item.file);
                      else message.info(copy.upload.previewHint);
                    }}
                  >
                    {copy.upload.preview}
                  </Button>
                )}
                {item.status === 'error' && (
                  <Button
                    size="small"
                    type="link"
                    icon={<RefreshCw size={13} />}
                    onClick={() => startSimulation(item.uid, item.file)}
                  >
                    {copy.upload.retry}
                  </Button>
                )}
                <Button
                  size="small"
                  type="link"
                  danger
                  icon={<Trash2 size={13} />}
                  onClick={() => removeItem(item.uid)}
                  aria-label={copy.upload.remove(item.file.name)}
                >
                  {copy.upload.removeLabel}
                </Button>
              </Space>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
