import { useState } from "react";
import { KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSecureRandomPassword } from "@/utils/password";

export interface PasswordGeneratorButtonProps {
  onGenerate: (password: string) => void;
  length?: number;
  requireComplexity?: boolean;
  className?: string;
  size?: "default" | "sm" | "icon";
  variant?: "outline" | "secondary" | "ghost";
}

export function PasswordGeneratorButton({
  onGenerate,
  length = 16,
  requireComplexity = true,
  className,
  size = "sm",
  variant = "outline",
}: PasswordGeneratorButtonProps) {
  const [generated, setGenerated] = useState(false);

  const handleClick = () => {
    const password = generateSecureRandomPassword(length, requireComplexity);
    onGenerate(password);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 1500);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      className={className}
      title="Generate strong random password"
      aria-label="Generate strong random password"
    >
      {generated ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <KeyRound className="h-4 w-4 text-primary" />
      )}
      <span className="ml-1.5 text-xs font-medium">Generate</span>
    </Button>
  );
}
