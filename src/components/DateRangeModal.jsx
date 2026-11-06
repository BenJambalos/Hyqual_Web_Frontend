import { useState } from "react";
import Modal from "./Modal";
import "./DateRangeModal.css";

function DateRangeModal({ onClose, onApply, initialRange = null }) {
  const [from, setFrom] = useState(initialRange?.from || "");
  const [to, setTo] = useState(initialRange?.to || "");
  const isInvalidRange = from && to && from > to;

  const handleApply = () => {
    if (from && to) onApply(from, to);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="date-range-content">
        <h3>Select date range</h3>

        <label>From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />

        <label>To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        {isInvalidRange && <p className="date-range-error" role="alert">End date must be on or after the start date.</p>}

        <button className="apply-btn" onClick={handleApply} disabled={!from || !to || isInvalidRange}>
          Apply
        </button>
      </div>
    </Modal>
  );
}

export default DateRangeModal;