export default function AlertMessage({ message, type = 'danger', onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} d-flex justify-content-between align-items-center`} role="alert">
      <span>{message}</span>
      {onClose ? (
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
      ) : null}
    </div>
  );
}

