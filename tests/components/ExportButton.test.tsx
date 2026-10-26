import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExportButton } from '../../src/components/ExportButton/ExportButton';
import { renderWithProviders } from '../testUtils';

describe('ExportButton', () => {
  it('labels filtered exports and calls the business handler', async () => {
    const user = userEvent.setup({ delay: null });
    const onExport = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ExportButton onExport={onExport} />);

    await user.click(screen.getByRole('button', { name: /导出/ }));
    await user.click(await screen.findByRole('menuitem', { name: '导出 CSV（当前筛选结果）' }));
    expect(onExport).toHaveBeenCalledWith('csv');
  });

  it('labels selected-row exports accurately', async () => {
    const user = userEvent.setup({ delay: null });
    const onExport = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ExportButton onExport={onExport} scope="selected" label="导出选中（2）" />);

    await user.click(screen.getByRole('button', { name: '导出选中（2）' }));
    expect(await screen.findByRole('menuitem', { name: '导出 XLSX（选中行）' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '导出 XLSX（选中行）' }));
    expect(onExport).toHaveBeenCalledWith('xlsx');
  });
});
