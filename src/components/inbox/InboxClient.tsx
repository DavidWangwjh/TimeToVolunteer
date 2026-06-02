"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  CheckCheck,
  Circle,
  ExternalLink,
  Inbox,
  MailOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteInboxMessages,
  markAllInboxMessagesRead,
  markInboxMessageRead,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { InboxMessage, InboxMessageKind } from "@/types/database";

type InboxFilter = "all" | "unread" | "read";

const kindLabels: Record<InboxMessageKind, string> = {
  booking_requested: "Booking request",
  booking_approved: "Booking accepted",
  booking_rejected: "Booking declined",
  membership_requested: "Organization request",
  membership_accepted: "Access accepted",
  membership_rejected: "Access declined",
};

const kindStyles: Record<InboxMessageKind, string> = {
  booking_requested: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  booking_approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  booking_rejected: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  membership_requested: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  membership_accepted: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  membership_rejected: "bg-rose-100 text-rose-800 hover:bg-rose-100",
};

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function InboxClient({
  messages,
}: {
  messages: InboxMessage[];
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const unreadCount = messages.filter((message) => !message.read_at).length;
  const readCount = messages.length - unreadCount;
  const visibleMessages = useMemo(() => {
    if (filter === "unread") {
      return messages.filter((message) => !message.read_at);
    }

    if (filter === "read") {
      return messages.filter((message) => message.read_at);
    }

    return messages;
  }, [filter, messages]);

  const visibleSelectedCount = visibleMessages.filter((message) =>
    selectedIds.includes(message.id)
  ).length;
  const allVisibleSelected =
    visibleMessages.length > 0 && visibleSelectedCount === visibleMessages.length;

  function toggleSelected(messageId: string) {
    setSelectedIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId]
    );
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !visibleMessages.some((message) => message.id === id)
        )
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...visibleMessages.map((message) => message.id)]))
    );
  }

  function runAction(
    action: () => Promise<{ error?: string; success?: boolean } | undefined>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action();

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
        setSelectedIds([]);
      }
    });
  }

  function markSelected(read: boolean) {
    const ids = selectedIds.filter((id) =>
      visibleMessages.some((message) => message.id === id)
    );

    if (ids.length === 0) {
      toast.error("Select at least one message");
      return;
    }

    runAction(
      async () => {
        for (const id of ids) {
          const result = await markInboxMessageRead(id, read);
          if (result?.error) return result;
        }

        return { success: true };
      },
      read ? "Marked as read" : "Marked as unread"
    );
  }

  function deleteSelected() {
    const ids = selectedIds.filter((id) =>
      visibleMessages.some((message) => message.id === id)
    );

    runAction(
      () => deleteInboxMessages(ids),
      ids.length === 1 ? "Message deleted" : "Messages deleted"
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", `All ${messages.length}`],
            ["unread", `Unread ${unreadCount}`],
            ["read", `Read ${readCount}`],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              className={filter === value ? "bg-emerald-800 hover:bg-emerald-700" : ""}
              onClick={() => {
                setFilter(value as InboxFilter);
                setSelectedIds([]);
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={visibleMessages.length === 0 || isPending}
            onClick={toggleVisibleSelection}
          >
            {allVisibleSelected ? "Clear selection" : "Select visible"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={unreadCount === 0 || isPending}
            onClick={() => runAction(markAllInboxMessagesRead, "All messages marked as read")}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedIds.length === 0 || isPending}
            onClick={() => markSelected(true)}
          >
            <MailOpen className="size-4" />
            Mark read
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedIds.length === 0 || isPending}
            onClick={() => markSelected(false)}
          >
            <Circle className="size-4" />
            Mark unread
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={selectedIds.length === 0 || isPending}
            onClick={deleteSelected}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {visibleMessages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-14 text-center">
          <Inbox className="mx-auto size-9 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-900">No messages here</p>
          <p className="mt-1 text-sm text-slate-500">
            Booking and organization updates will show up in this inbox.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5">
          <ul className="divide-y divide-slate-200">
            {visibleMessages.map((message) => {
              const isUnread = !message.read_at;
              const isSelected = selectedIds.includes(message.id);

              return (
                <li
                  key={message.id}
                  className={cn(
                    "grid gap-3 p-4 transition-colors sm:grid-cols-[auto_1fr_auto]",
                    isUnread ? "bg-emerald-50/60" : "bg-white",
                    isSelected && "ring-2 ring-inset ring-emerald-300"
                  )}
                >
                  <label className="flex items-start gap-3 sm:block">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-slate-300 accent-emerald-800"
                      checked={isSelected}
                      onChange={() => toggleSelected(message.id)}
                    />
                    <span className="sr-only">Select message</span>
                  </label>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread && (
                        <span className="size-2 rounded-full bg-emerald-700" />
                      )}
                      <Badge className={kindStyles[message.kind]}>
                        {kindLabels[message.kind]}
                      </Badge>
                      <span className="text-xs font-medium text-slate-500">
                        {formatMessageDate(message.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-2 text-base font-bold text-slate-950">
                      {message.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      {message.body}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {message.action_href && (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={message.action_href}
                          onClick={() => {
                            if (isUnread) {
                              void markInboxMessageRead(message.id, true);
                            }
                          }}
                        >
                          <ExternalLink className="size-4" />
                          Open
                        </Link>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () => markInboxMessageRead(message.id, isUnread),
                          isUnread ? "Marked as read" : "Marked as unread"
                        )
                      }
                    >
                      {isUnread ? "Mark read" : "Mark unread"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () => deleteInboxMessages([message.id]),
                          "Message deleted"
                        )
                      }
                    >
                      <Archive className="size-4" />
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
