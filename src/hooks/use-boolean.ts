import { useCallback, useState } from "react";

export function useBoolean(initial = false) {
  const [value, setValue] = useState(initial);
  return {
    value,
    onTrue: useCallback(() => setValue(true), []),
    onFalse: useCallback(() => setValue(false), []),
    toggle: useCallback(() => setValue((previous) => !previous), []),
    setValue,
  };
}
