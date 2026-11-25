// ConfirmModal.jsx — Custom confirmation dialog replacing window.confirm()
import React, { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmText='Confirm']
 * @param {string} [props.cancelText='Cancel']
 * @param {string} [props.variant='danger'] - 'danger' | 'warning' | 'info'
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // Focus the safest control (cancel) on open; hand focus back to the opener on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
  }, [open]);

  // Escape closes; Tab and Shift+Tab cycle focus inside the dialog.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const variantClass = variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-warning' : 'btn-primary';

  return (
    <div
      ref={dialogRef}
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} className="confirm-modal-title">{title}</h3>
        <p id={messageId} className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button ref={cancelRef} className="btn btn-ghost btn-sm" onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button
            className={`btn btn-sm ${variantClass}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
