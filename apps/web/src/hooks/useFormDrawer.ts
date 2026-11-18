import { useState, useCallback } from "react";

export interface UseFormDrawerReturn<T> {
  isOpen: boolean;
  editingItem: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  close: () => void;
  setIsOpen: (open: boolean) => void;
}

export function useFormDrawer<
  T = Record<string, unknown>,
>(): UseFormDrawerReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
  }, []);

  return {
    isOpen,
    editingItem,
    openCreate,
    openEdit,
    close,
    setIsOpen,
  };
}
