import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';

const baseProps = {
  title: 'Leave Room?',
  message: 'Are you sure you want to leave the room?',
  confirmText: 'Leave',
  cancelText: 'Stay',
  variant: 'danger',
};

function renderOpenModal() {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<ConfirmModal open {...baseProps} onCancel={onCancel} onConfirm={onConfirm} />);
  return {
    onCancel,
    onConfirm,
    dialog: screen.getByRole('dialog'),
    cancel: screen.getByRole('button', { name: 'Stay' }),
    confirm: screen.getByRole('button', { name: 'Leave' }),
  };
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmModal
        open={open}
        {...baseProps}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmModal accessibility', () => {
  it('moves focus into the dialog on open, onto the cancel button', () => {
    const { dialog, cancel } = renderOpenModal();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(cancel);
  });

  it('keeps role, aria-modal and an accessible name', () => {
    const { dialog } = renderOpenModal();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Leave Room?');
  });

  it('wraps Tab from the last control to the first', () => {
    const { confirm, cancel } = renderOpenModal();
    confirm.focus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const { confirm, cancel } = renderOpenModal();
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('calls onCancel when Escape is pressed', () => {
    const { onCancel } = renderOpenModal();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the opener when the dialog closes', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
