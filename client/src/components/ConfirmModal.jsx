// ConfirmModal.jsx — Custom confirmation dialog replacing window.confirm()
import React, { useEffect, useRef } from 'react';

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
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const variantClass = variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-warning' : 'btn-primary';

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button
            ref={confirmRef}
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
