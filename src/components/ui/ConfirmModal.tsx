import { Modal } from './Modal'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger = false, onConfirm, onCancel
}: ConfirmModalProps) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
        <button className="btn btn-secondary w-full" onClick={onCancel}>{cancelLabel}</button>
        <button
          className={`btn w-full ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    }>
      <p style={{ color: 'var(--color-text-2)' }}>{message}</p>
    </Modal>
  )
}
