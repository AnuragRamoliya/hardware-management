import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application rendering error", error, info.componentStack);
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
            <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page could not be displayed. Reload this view to try again.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </Button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
