"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { RecipientForm } from "./RecipientForm";

/** Opens the recipient create form in a modal instead of a separate page. */
export function AddRecipientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add recipient
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add recipient"
        description="Create a new person in the directory."
      >
        <RecipientForm mode="create" onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
