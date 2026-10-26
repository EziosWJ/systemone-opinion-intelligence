import { useCallback } from 'react';
import { App } from 'antd';
import { copy } from '../config/copy';

export interface ConfirmActionOptions {
  title: string;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmAction() {
  const { modal } = App.useApp();

  return useCallback(
    (options: ConfirmActionOptions) => {
      modal.confirm({
        title: options.title,
        content: options.content,
        okText: options.okText ?? copy.common.confirm,
        cancelText: options.cancelText ?? copy.common.cancel,
        okButtonProps: options.danger ? { danger: true } : undefined,
        centered: true,
        onOk: async () => {
          await options.onConfirm();
        },
      });
    },
    [modal],
  );
}
