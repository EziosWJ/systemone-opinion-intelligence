import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MockUpload } from '../../src/components/MockUpload/MockUpload';
import { renderWithProviders } from '../testUtils';

function uploadInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input;
}

describe('MockUpload', () => {
  it('validates file type and size without contacting a server', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderWithProviders(<MockUpload accept=".csv,.xlsx" maxSizeMB={0.001} />);

    const input = uploadInput(container);
    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByText(/不支持的文件类型/)).toBeInTheDocument();

    await user.upload(
      uploadInput(container),
      new File(['x'.repeat(2048)], 'large.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText(/文件大小不能超过/)).toBeInTheDocument();
    expect(screen.queryByText('模拟上传成功')).not.toBeInTheDocument();
  });

  it('shows progress and a successful simulated upload with preview', async () => {
    const user = userEvent.setup({ delay: null });
    const onPreview = vi.fn();
    const { container } = renderWithProviders(<MockUpload onPreview={onPreview} />);

    await user.upload(uploadInput(container), new File(['a,b'], 'customers.csv', { type: 'text/csv' }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByText('模拟上传成功', {}, { timeout: 4000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '预览' }));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('fails deterministically for names containing fail and allows retry', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderWithProviders(<MockUpload maxCount={1} />);

    await user.upload(uploadInput(container), new File(['a,b'], 'broken-fail.csv', { type: 'text/csv' }));
    expect(await screen.findByText(/模拟上传失败/, {}, { timeout: 4000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /重试/ }));
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText(/模拟上传失败/)).toBeInTheDocument(),
      { timeout: 4000 },
    );
  });
});
