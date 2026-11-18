export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
  tone: "muted" | "danger" | "warning" | "info" | "success";
  barColor: string;
  textColor: string;
}

export function generateSecureRandomPassword(
  length = 16,
  requireComplexity = true,
): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+~|}{[]:;?><,./-=";

  const allChars = requireComplexity
    ? lowercase + uppercase + numbers + symbols
    : lowercase + uppercase + numbers;

  const cryptoObj =
    typeof window !== "undefined" && window.crypto ? window.crypto : null;

  if (!cryptoObj) {
    return Math.random().toString(36).slice(-length);
  }

  const values = new Uint32Array(length);
  cryptoObj.getRandomValues(values);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += allChars.charAt(values[i]! % allChars.length);
  }

  if (requireComplexity) {
    const hasLower = /[a-z]/.test(result);
    const hasUpper = /[A-Z]/.test(result);
    const hasNum = /[0-9]/.test(result);
    const hasSym = /[^a-zA-Z0-9]/.test(result);

    if (!hasLower || !hasUpper || !hasNum || !hasSym) {
      return generateSecureRandomPassword(length, requireComplexity);
    }
  }

  return result;
}

export function calculatePasswordStrength(
  password: string,
  minLength = 12,
  requireComplexity = true,
): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: "Empty",
      tone: "muted",
      barColor: "bg-muted",
      textColor: "text-muted-foreground",
    };
  }

  let points = 0;

  if (password.length >= minLength) points += 1;
  if (password.length >= 16) points += 1;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const classesCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(
    Boolean,
  ).length;
  if (classesCount >= 3) points += 1;
  if (classesCount === 4 && password.length >= minLength) points += 1;

  if (password.length < 8) {
    return {
      score: 1,
      label: "Weak",
      tone: "danger",
      barColor: "bg-danger",
      textColor: "text-danger",
    };
  }

  if (requireComplexity && classesCount < 2) {
    return {
      score: 1,
      label: "Weak",
      tone: "danger",
      barColor: "bg-danger",
      textColor: "text-danger",
    };
  }

  if (points <= 1) {
    return {
      score: 1,
      label: "Weak",
      tone: "danger",
      barColor: "bg-danger",
      textColor: "text-danger",
    };
  }

  if (points === 2) {
    return {
      score: 2,
      label: "Fair",
      tone: "warning",
      barColor: "bg-warning",
      textColor: "text-warning",
    };
  }

  if (points === 3) {
    return {
      score: 3,
      label: "Good",
      tone: "info",
      barColor: "bg-info",
      textColor: "text-info",
    };
  }

  return {
    score: 4,
    label: "Strong",
    tone: "success",
    barColor: "bg-success",
    textColor: "text-success",
  };
}
