import Swal from "sweetalert2"

/** Pre-configured SweetAlert2 instance matching app theme */
const swal = Swal.mixin({
  customClass: {
    popup: "!bg-[var(--color-surface)] !text-[var(--color-text)] !rounded-2xl !shadow-2xl !border !border-[var(--color-border)]",
    title: "!text-[var(--color-text)] !text-lg !font-semibold",
    htmlContainer: "!text-[var(--color-text-2)] !text-sm",
    confirmButton: "!rounded-lg !px-5 !py-2.5 !text-sm !font-medium",
    cancelButton: "!rounded-lg !px-5 !py-2.5 !text-sm !font-medium !bg-[var(--color-bg-2)] !text-[var(--color-text)]",
  },
  buttonsStyling: true,
  reverseButtons: true,
})

/** Danger confirmation (delete, revoke, etc.) */
export async function confirmDanger(title: string, text: string): Promise<boolean> {
  const result = await swal.fire({
    title,
    text,
    icon: "warning",
    iconColor: "#ef4444",
    showCancelButton: true,
    confirmButtonText: "Yes, proceed",
    confirmButtonColor: "#ef4444",
    cancelButtonText: "Cancel",
  })
  return result.isConfirmed
}

/** Warning confirmation (lock, finalize, etc.) */
export async function confirmWarning(title: string, text: string): Promise<boolean> {
  const result = await swal.fire({
    title,
    text,
    icon: "warning",
    iconColor: "#f59e0b",
    showCancelButton: true,
    confirmButtonText: "Yes, proceed",
    confirmButtonColor: "#f59e0b",
    cancelButtonText: "Cancel",
  })
  return result.isConfirmed
}

/** Info confirmation (reset, send command, etc.) */
export async function confirmAction(title: string, text: string): Promise<boolean> {
  const result = await swal.fire({
    title,
    text,
    icon: "question",
    iconColor: "#3b82f6",
    showCancelButton: true,
    confirmButtonText: "Confirm",
    confirmButtonColor: "#3b82f6",
    cancelButtonText: "Cancel",
  })
  return result.isConfirmed
}

/** Success toast (auto-dismiss) */
export function showSuccess(title: string, text?: string) {
  swal.fire({
    title,
    text,
    icon: "success",
    iconColor: "#22c55e",
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
  })
}

/** Error toast */
export function showError(title: string, text?: string) {
  swal.fire({
    title,
    text,
    icon: "error",
    iconColor: "#ef4444",
    confirmButtonColor: "#ef4444",
  })
}
