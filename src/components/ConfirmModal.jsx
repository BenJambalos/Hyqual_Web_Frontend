import { useState } from "react";
import Modal from "./Modal";
import "./ConfirmModal.css";

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, onConfirm, onClose }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (requestError) {
      console.error("Unable to complete the requested action:", requestError);
      setError(requestError.message || "Unable to complete this action.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="confirm-modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="confirm-modal-actions">
          <button className="confirm-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className={"confirm-ok-btn" + (danger ? " confirm-ok-danger" : "")}
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;