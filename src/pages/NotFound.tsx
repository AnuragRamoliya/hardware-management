import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/paths";

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page isn’t here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page may have moved or you may not have access.
        </p>
        <Link to={PATHS.ROOT}>
          <Button className="mt-6">Back to workspace</Button>
        </Link>
      </div>
    </main>
  );
}
