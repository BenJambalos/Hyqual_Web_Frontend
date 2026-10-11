import { useState } from "react";
import Modal from "./Modal";
import "./UserFormModal.css";

const emptyForm = {
  firstName: "", lastName: "", middleName: "", phone: "", email: "",
  password: "", role: "BFAR Admin", farmName: "", street: "", barangay: "", city: "",
};

function UserFormModal({ mode, initialData, onClose, onSubmit, onArchiveClick }) {
  const [form, setForm] = useState(initialData || emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isFarmOwner = form.role === "Farm Owner";

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (submitError) {
      console.error("Unable to save user:", submitError);
      setError(submitError.message || "Unable to save this user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="user-form-content">
        <h2>{mode === "add" ? "Add User" : "Edit User"}</h2>

        <div className="uf-row">
          <div className="uf-field">
            <label>First name</label>
            <input value={form.firstName} onChange={handleChange("firstName")} placeholder="First name" />
          </div>
          <div className="uf-field">
            <label>Last name</label>
            <input value={form.lastName} onChange={handleChange("lastName")} placeholder="Last name" />
          </div>
        </div>

        <div className="uf-row">
          <div className="uf-field">
            <label>Middle name</label>
            <input value={form.middleName} onChange={handleChange("middleName")} placeholder="Middle name" />
          </div>
          <div className="uf-field">
            <label>Phone no.</label>
            <input value={form.phone} onChange={handleChange("phone")} placeholder="Phone no." />
          </div>
        </div>

        <div className="uf-field">
          <label>Email address</label>
          <input value={form.email} onChange={handleChange("email")} placeholder="Email address" />
        </div>

        {mode === "add" && (
          <div className="uf-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>
        )}

        <label className="uf-section-label">Role</label>
        <div className="uf-row">
          <button
            type="button"
            className={"uf-role-btn" + (form.role === "BFAR Admin" ? " uf-role-btn-active" : "")}
            onClick={() => setForm({ ...form, role: "BFAR Admin" })}
          >
            BFAR Administrator
          </button>
          <button
            type="button"
            className={"uf-role-btn" + (isFarmOwner ? " uf-role-btn-active" : "")}
            onClick={() => setForm({ ...form, role: "Farm Owner" })}
          >
            Aquafarm Owner
          </button>
        </div>

        {isFarmOwner && (
          <div className="uf-field">
            <label>Aquafarm Name</label>
            <input value={form.farmName} onChange={handleChange("farmName")} placeholder="Aquafarm name" />
          </div>
        )}

        <label className="uf-section-label">{isFarmOwner ? "Aquafarm Location" : "Address"}</label>
        <div className="uf-row-3">
          <input value={form.street} onChange={handleChange("street")} placeholder="Street" />
          <input value={form.barangay} onChange={handleChange("barangay")} placeholder="Barangay" />
          <input value={form.city} onChange={handleChange("city")} placeholder="City" />
        </div>

        <div className="uf-footer">
          {mode === "edit" ? (
            <button className="uf-archive-btn" onClick={onArchiveClick}>Archive</button>
          ) : <span />}
          <div className="uf-footer-right">
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="uf-cancel-btn" onClick={onClose}>Cancel</button>
            <button className="uf-submit-btn" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : mode === "add" ? "Add user" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default UserFormModal;