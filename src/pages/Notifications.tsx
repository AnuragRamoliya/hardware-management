import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import { EmptyState } from "@/components/common/States";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Notification = { id: number; kind: string; title: string; message: string; read_at: string | null; createdAt: string };

export function Notifications() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const result = await callApi<Notification[]>({ url: endPoints.notifications, method: "GET" });
      if (!result.ok) throw new Error(result.message || "Unable to load notifications");
      return result.data ?? [];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const result = await callApi({ url: endPoints.notifications + "/" + id + "/read", method: "POST", body: {} });
      if (!result.ok) throw new Error(result.message || "Unable to update notification");
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Notification marked as read"); },
    onError: (error) => toast.error(error.message),
  });
  const unread = query.data?.filter((item) => !item.read_at).length ?? 0;
  return (
    <>
      <PageHeader title="Notifications" description="Stay up to date with important changes across your workspace." />
      {query.isError && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{query.error.message}</p>}
      <Card className="p-4 sm:p-6">
        {query.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading notifications…</p> : query.data?.length ? (
          <ul className="divide-y">
            {query.data.map((notification) => <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0" key={notification.id}>
              <span className="rounded-full bg-accent p-2 text-primary"><Bell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-medium">{notification.title}</h2>{!notification.read_at && <Badge variant="info">New</Badge>}</div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
              </div>
              {!notification.read_at && <Button variant="ghost" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}><Check className="mr-1.5 h-4 w-4" />Mark read</Button>}
            </li>)}
          </ul>
        ) : <EmptyState title="You’re all caught up" description={unread ? `${unread} unread notifications` : "New warranty, renewal, and overdue alerts will appear here."} />}
      </Card>
    </>
  );
}
