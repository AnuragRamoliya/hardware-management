import { Laptop, PackageCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PATHS } from "@/routes/paths";

export function Portal() {
  return (
    <>
      <PageHeader
        title="Your IT portal"
        description="A personal view of the tools and equipment that help you do your best work."
        action={
          <Link
            to={PATHS.PORTAL_PROFILE}
            className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"
          >
            <UserRound className="h-4 w-4" />
            My profile
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          [Laptop, "Assigned equipment", "View devices assigned to you.", PATHS.PORTAL_ASSETS, "View my assets"],
          [PackageCheck, "Software access", "Your approved work applications.", PATHS.PORTAL_SOFTWARE, "View my software"],
          [UserRound, "Profile", "Keep your details up to date.", PATHS.PORTAL_PROFILE, "View my profile"],
        ].map(([Icon, title, description, to, action]) => {
          const IconComponent = Icon as typeof Laptop;
          return (
            <Card className="p-5" key={String(title)}>
              <span className="inline-flex rounded-lg bg-accent p-2.5 text-primary">
                <IconComponent className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold">{String(title)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {String(description)}
              </p>
              <Link className="mt-4 inline-flex text-sm font-medium text-primary hover:underline" to={String(to)}>{String(action)}</Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
