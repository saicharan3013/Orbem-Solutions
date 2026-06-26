export default function Modal({ 
  isOpen, 
  title, 
  message, 
  type = 'info', 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  children, 
  onClose,
  size = 'md'
}) {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose && handleClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {handleClose && (
            <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>
          )}
        </div>
        <div className="modal-body">
          {message && (
            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '18px', lineHeight: '1.6' }}>
              {message}
            </div>
          )}
          {children}
        </div>
        <div className="modal-footer">
          {handleClose && <button className="btn btn-outline" onClick={handleClose}>{cancelText}</button>}
          {onConfirm && <button className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>}
        </div>
      </div>
    </div>
  );
}
