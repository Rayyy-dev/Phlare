"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that asks for confirmation before allowing its parent <form> to
 * submit. Used for destructive actions (soft-delete, member removal).
 */
export function ConfirmSubmit({
  children,
  message,
  className = "text-sm font-medium text-red-600 hover:text-red-700",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
