import { useState } from "react";
import Modal from "./Modal";
import "./DateRangeModal.css";

function DateRangeModal({ onClose, onApply }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

        <button className="apply-btn" onClick={handleApply} disabled={!from || !to}>
          Apply
        </button>
      </div>
    </Modal>
  );
}

export default DateRangeModal;