import { useMemo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Bell, Check } from "lucide-react";
import { EmptyState, Spinner } from "@/components/common/States";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useNotificationsList,
  useMarkNotificationRead,
  type NotificationRecord,
} from "@/hooks/queries/notifications";

function formattedDate(value?: string) {
  if (!value) return "";
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy · h:mm a") : value;
}

export function Notifications() {
  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useNotificationsList();
  const markReadMutation = useMarkNotificationRead();

  const unreadCount = useMemo(() => {
    return (notifications ?? []).filter((item) => !item.read_at).length;
  }, [notifications]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay up to date with important changes and alerts across your workspace."
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Notifications" },
        ]}
        action={
          unreadCount > 0 ? (
            <Badge variant="info" className="px-3 py-1 text-xs">
              {unreadCount} unread
            </Badge>
          ) : undefined
        }
      />

      <Card className="p-4 sm:p-6">
        {isLoading ? (
          <div className="py-12">
            <Spinner label="Loading notifications" />
          </div>
        ) : error ? (
          <div role="alert" className="py-6 text-center">
            <p className="text-sm text-danger">
              {error instanceof Error
                ? error.message
                : "Unable to load notifications"}
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <ul className="divide-y">
            {notifications.map((notification: NotificationRecord) => (
              <li
                key={notification.id}
                className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                <span className="rounded-full bg-accent p-2.5 text-primary">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      {notification.title}
                    </h2>
                    {!notification.read_at && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <time
                    className="mt-2 block text-xs text-muted-foreground"
                    dateTime={notification.createdAt}
                  >
                    {formattedDate(notification.createdAt)}
                  </time>
                </div>
                {!notification.read_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={markReadMutation.isPending}
                    onClick={() => markReadMutation.mutate(notification.id)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="You’re all caught up"
            description="New warranty expiration, license renewal, and overdue hardware alerts will appear here."
          />
        )}
      </Card>
    </div>
  );
}
