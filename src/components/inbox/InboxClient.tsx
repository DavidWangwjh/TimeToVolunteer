"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  CheckCheck,
  Circle,
  Inbox,
  MailOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteInboxMessages,
  markAllInboxMessagesRead,
  markInboxMessageRead,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { InboxMessage, InboxMessageKind } from "@/types/database";

type InboxFilter = "all" | "unread" | "read";
type InboxViewer = "volunteer" | "organization" | "admin";
type InboxMessageWithSender = InboxMessage & {
  actor?:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | Array<{
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>
    | null;
  organizations?:
    | {
        id: string | null;
        name: string | null;
      }
    | Array<{
        id: string | null;
        name: string | null;
      }>
    | null;
};

const kindLabels: Record<InboxMessageKind, string> = {
  booking_requested: "Registration request",
  booking_approved: "Registration accepted",
  booking_rejected: "Registration declined",
  opportunity_updated: "Opportunity update",
  membership_requested: "Organization request",
  membership_accepted: "Access accepted",
  membership_rejected: "Access declined",
  direct_message: "Message",
};

const kindStyles: Record<InboxMessageKind, string> = {
  booking_requested: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  booking_approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  booking_rejected: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  opportunity_updated: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  membership_requested: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  membership_accepted: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  membership_rejected: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  direct_message: "bg-slate-100 text-slate-800 hover:bg-slate-100",
};

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getSenderLabel(message: InboxMessageWithSender) {
  const organization = firstRelation(message.organizations);

  if (organization?.name) {
    return organization.name;
  }

  const actor = firstRelation(message.actor);
  const actorName = `${actor?.first_name ?? ""} ${
    actor?.last_name ?? ""
  }`.trim();

  if (actorName) {
    return actorName;
  }

  if (actor?.email) {
    return actor.email;
  }

  return "TimeToVolunteer";
}

function getOrganizationHref(
  organizationId: string | null | undefined,
  viewer: InboxViewer
) {
  if (!organizationId) return null;

  if (viewer === "admin") {
    return `/dashboard/admin/organizations/${organizationId}`;
  }

  if (viewer === "organization") {
    return "/dashboard/organization/profile";
  }

  return `/dashboard/volunteer/organizations/${organizationId}`;
}

export function InboxClient({
  messages,
  viewer,
}: {
  messages: InboxMessageWithSender[];
  viewer: InboxViewer;
}) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<InboxMessageWithSender | null>(null);
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

  function openMessage(message: InboxMessageWithSender) {
    setSelectedMessage(message);

    if (!message.read_at) {
      void markInboxMessageRead(message.id, true);
    }
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
            Registration and organization updates will show up in this inbox.
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
                  role="button"
                  tabIndex={0}
                  onClick={() => openMessage(message)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openMessage(message);
                    }
                  }}
                  className={cn(
                    "grid cursor-pointer gap-3 p-4 transition-colors hover:bg-emerald-50/40 sm:grid-cols-[auto_1fr_auto]",
                    isUnread ? "bg-emerald-50/60" : "bg-white",
                    isSelected && "ring-2 ring-inset ring-emerald-300"
                  )}
                >
                  <label
                    className="flex items-start gap-3 sm:block"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-slate-300 accent-emerald-800"
                      checked={isSelected}
                      onChange={() => toggleSelected(message.id)}
                    />
                    <span className="sr-only">Select message</span>
                  </label>

                  <div className="min-w-0 overflow-hidden">
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
                    <SenderLine message={message} viewer={viewer} />

                    <h2 className="mt-2 line-clamp-1 text-base font-bold text-slate-950">
                      {message.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {message.body}
                    </p>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 sm:justify-end"
                    onClick={(event) => event.stopPropagation()}
                  >
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

      <Dialog
        open={Boolean(selectedMessage)}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      >
        {selectedMessage && (
          <DialogContent className="max-h-[min(36rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <Badge className={kindStyles[selectedMessage.kind]}>
                  {kindLabels[selectedMessage.kind]}
                </Badge>
                <span className="text-xs font-medium text-slate-500">
                  {formatMessageDate(selectedMessage.created_at)}
                </span>
              </div>
              <DialogTitle className="pr-8 text-xl font-bold leading-tight text-slate-950">
                {selectedMessage.title}
              </DialogTitle>
              <SenderLine message={selectedMessage} viewer={viewer} />
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {selectedMessage.body}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SenderLine({
  message,
  viewer,
}: {
  message: InboxMessageWithSender;
  viewer: InboxViewer;
}) {
  const organization = firstRelation(message.organizations);
  const href = getOrganizationHref(organization?.id, viewer);
  const label = getSenderLabel(message);

  return (
    <p className="mt-1 text-xs font-semibold text-slate-500">
      From{" "}
      {href ? (
        <Link
          href={href}
          className="text-emerald-800 underline-offset-2 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {label}
        </Link>
      ) : (
        label
      )}
    </p>
  );
}
