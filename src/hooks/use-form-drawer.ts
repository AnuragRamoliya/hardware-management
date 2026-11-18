import { useCallback, useState } from "react";

export function useFormDrawer({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const requestClose = useCallback((nextOpen = false) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    setOpen(false);
  }, [isDirty]);
  const discard = useCallback(() => {
    setConfirmDiscardOpen(false);
    setOpen(false);
    onDiscard?.();
  }, [onDiscard]);
  return { open, show, requestClose, confirmDiscardOpen, setConfirmDiscardOpen, discard };
}
