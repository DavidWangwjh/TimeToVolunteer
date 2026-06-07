import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalendarListTabsProps {
  listCount: number;
}

export function CalendarListTabs({ listCount }: CalendarListTabsProps) {
  return (
    <TabsList className="!h-10 w-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <TabsTrigger className="min-w-0 px-3" value="calendar">
        Calendar
      </TabsTrigger>
      <TabsTrigger className="min-w-0 px-3" value="list">
        List ({listCount})
      </TabsTrigger>
    </TabsList>
  );
}
