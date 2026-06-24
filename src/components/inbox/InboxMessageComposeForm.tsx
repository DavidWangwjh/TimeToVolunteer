"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  searchAdminMessageReceivers,
  searchOrganizationMessageReceivers,
  sendAdminInboxMessage,
  sendOrganizationInboxMessage,
  type InboxReceiverOption,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

type ComposeMode = "organization" | "admin";
type AdminReceiverType = "volunteers" | "organizations" | "both";

const pageSize = 25;
const selectedPageSize = 40;

export function InboxMessageComposeForm({ mode }: { mode: ComposeMode }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [adminReceiverType, setAdminReceiverType] =
    useState<AdminReceiverType>("volunteers");
  const [results, setResults] = useState<InboxReceiverOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Record<string, InboxReceiverOption>>({});
  const [selectedVisibleCount, setSelectedVisibleCount] =
    useState(selectedPageSize);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearchTransition] = useTransition();

  const selectedReceivers = useMemo(
    () => Object.values(selected).sort((a, b) => a.name.localeCompare(b.name)),
    [selected]
  );
  const selectedIds = selectedReceivers.map((receiver) => receiver.id);
  const visibleSelectedReceivers = selectedReceivers.slice(
    0,
    selectedVisibleCount
  );

  function runSearch(nextOffset = 0, append = false) {
    const searchQuery = append ? searchedQuery : query;

    startSearchTransition(async () => {
      const result =
        mode === "organization"
          ? await searchOrganizationMessageReceivers({
              query: searchQuery,
              offset: nextOffset,
              limit: pageSize,
            })
          : await searchAdminMessageReceivers({
              receiverType: adminReceiverType,
              query: searchQuery,
              offset: nextOffset,
              limit: pageSize,
            });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      const nextReceivers = result.receivers ?? [];
      setSearchedQuery(searchQuery);
      setResults((current) =>
        append ? mergeReceivers(current, nextReceivers) : nextReceivers
      );
      setHasMore(Boolean(result.hasMore));
    });
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminReceiverType, mode]);

  function selectReceiver(receiver: InboxReceiverOption) {
    setSelected((current) => ({ ...current, [receiver.id]: receiver }));
  }

  function unselectReceiver(receiverId: string) {
    setSelected((current) => {
      const next = { ...current };
      delete next[receiverId];
      return next;
    });
  }

  function selectVisibleResults() {
    setSelected((current) => {
      const next = { ...current };
      for (const receiver of results) {
        next[receiver.id] = receiver;
      }
      return next;
    });
  }

  function selectAllMatching() {
    startSearchTransition(async () => {
      const allReceivers: InboxReceiverOption[] = [];
      let offset = 0;
      let more = true;
      const searchQuery = searchedQuery;

      while (more && offset < 10000) {
        const result =
          mode === "organization"
            ? await searchOrganizationMessageReceivers({
                query: searchQuery,
                offset,
                limit: 50,
              })
            : await searchAdminMessageReceivers({
                receiverType: adminReceiverType,
                query: searchQuery,
                offset,
                limit: 50,
              });

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        allReceivers.push(...(result.receivers ?? []));
        more = Boolean(result.hasMore);
        offset += 50;
      }

      setSelected((current) => {
        const next = { ...current };
        for (const receiver of allReceivers) {
          next[receiver.id] = receiver;
        }
        return next;
      });
      toast.success(`${allReceivers.length} recipients selected`);
    });
  }

  function submitMessage() {
    startTransition(async () => {
      const action =
        mode === "organization"
          ? sendOrganizationInboxMessage
          : sendAdminInboxMessage;
      const result = await action({
        receiverIds: selectedIds,
        title,
        body,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      const sentCount = "sentCount" in result ? result.sentCount : selectedIds.length;
      toast.success(
        `Message sent to ${sentCount} recipient${
          sentCount === 1 ? "" : "s"
        }`
      );
      setSelected({});
      setTitle("");
      setBody("");
      router.push(
        mode === "organization"
          ? "/dashboard/organization/inbox"
          : "/dashboard/admin/inbox"
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div>
            <h1 className="text-xl font-bold text-slate-950">
              New inbox message
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose recipients, then write the message they will see in their
              TimeToVolunteer inbox.
            </p>
          </div>

          {mode === "admin" && (
            <div className="space-y-2">
              <Label>Recipient type</Label>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  ["volunteers", "Volunteers"],
                  ["organizations", "Organizations"],
                  ["both", "Both"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-semibold transition",
                      adminReceiverType === value
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                    onClick={() => {
                      setAdminReceiverType(value as AdminReceiverType);
                      setResults([]);
                      setHasMore(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recipient-search">Recipients</Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <Search className="size-4 text-slate-500" />
                <Input
                  id="recipient-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runSearch();
                    }
                  }}
                  placeholder={
                    mode === "organization"
                      ? "Search accepted members"
                      : "Search name, email, or organization"
                  }
                  className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isSearching}
                onClick={() => runSearch()}
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={results.length === 0 || isSearching}
              onClick={selectVisibleResults}
            >
              Select visible
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSearching}
              onClick={selectAllMatching}
            >
              Select all matching
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200">
            {results.length === 0 ? (
              <div className="p-5 text-center text-sm text-slate-500">
                {isSearching ? "Searching..." : "No recipients found."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {results.map((receiver) => {
                  const isSelected = Boolean(selected[receiver.id]);

                  return (
                    <li
                      key={receiver.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <ReceiverSummary receiver={receiver} />
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "outline" : "default"}
                        className={
                          isSelected
                            ? ""
                            : "bg-emerald-800 hover:bg-emerald-700"
                        }
                        onClick={() =>
                          isSelected
                            ? unselectReceiver(receiver.id)
                            : selectReceiver(receiver)
                        }
                      >
                        {isSelected ? (
                          <>
                            <Check className="size-4" />
                            Selected
                          </>
                        ) : (
                          "Select"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasMore && (
            <Button
              type="button"
              variant="outline"
              disabled={isSearching}
              onClick={() => runSearch(results.length, true)}
            >
              Load more
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="message-title">Message title</Label>
            <Input
              id="message-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={140}
              placeholder="Message title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-body">Message</Label>
            <Textarea
              id="message-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-40 resize-y"
              placeholder="Write your message"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  mode === "organization"
                    ? "/dashboard/organization/inbox"
                    : "/dashboard/admin/inbox"
                )
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-800 hover:bg-emerald-700"
              disabled={isPending}
              onClick={submitMessage}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send message
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Selected recipients</h2>
              <p className="text-sm text-slate-500">
                {selectedReceivers.length} selected
              </p>
            </div>
            {selectedReceivers.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected({})}
              >
                Clear
              </Button>
            )}
          </div>

          {selectedReceivers.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
              Selected recipients will appear here.
            </div>
          ) : (
            <>
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {visibleSelectedReceivers.map((receiver) => (
                  <li
                    key={receiver.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <ReceiverSummary receiver={receiver} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => unselectReceiver(receiver.id)}
                      aria-label={`Remove ${receiver.name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              {selectedVisibleCount < selectedReceivers.length && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    setSelectedVisibleCount((current) =>
                      Math.min(current + selectedPageSize, selectedReceivers.length)
                    )
                  }
                >
                  Show more selected
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiverSummary({ receiver }: { receiver: InboxReceiverOption }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-slate-950">
        {receiver.name}
      </p>
      <p className="truncate text-xs text-slate-500">
        {[receiver.email, receiver.detail].filter(Boolean).join(" · ") ||
          "No email available"}
      </p>
    </div>
  );
}

function mergeReceivers(
  current: InboxReceiverOption[],
  next: InboxReceiverOption[]
) {
  const receiverMap = new Map<string, InboxReceiverOption>();

  for (const receiver of [...current, ...next]) {
    receiverMap.set(receiver.id, receiver);
  }

  return Array.from(receiverMap.values());
}
