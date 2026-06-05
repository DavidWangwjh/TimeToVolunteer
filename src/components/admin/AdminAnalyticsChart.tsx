"use client";

import { useMemo, useState } from "react";
import { BarChart3, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AnalyticsSeriesKey =
  | "volunteers"
  | "organizations"
  | "opportunities"
  | "registrations";

interface AnalyticsEvent {
  type: AnalyticsSeriesKey;
  created_at: string;
}

interface AdminAnalyticsChartProps {
  events: AnalyticsEvent[];
}

const seriesConfig: Record<
  AnalyticsSeriesKey,
  { label: string; color: string }
> = {
  volunteers: { label: "Volunteers", color: "#047857" },
  organizations: { label: "Organizations", color: "#2563eb" },
  opportunities: { label: "Opportunities", color: "#c2410c" },
  registrations: { label: "Registrations", color: "#7c3aed" },
};

const seriesKeys = Object.keys(seriesConfig) as AnalyticsSeriesKey[];
const dayMs = 24 * 60 * 60 * 1000;

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function parseDateKey(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultEndDate() {
  return toDateKey(new Date());
}

function getDefaultStartDate(days: number) {
  return toDateKey(new Date(Date.now() - (days - 1) * dayMs));
}

export function AdminAnalyticsChart({ events }: AdminAnalyticsChartProps) {
  const [range, setRange] = useState<"7" | "30" | "custom">("30");
  const [chartType, setChartType] = useState<"line" | "bar">("bar");
  const [customStart, setCustomStart] = useState(getDefaultStartDate(30));
  const [customEnd, setCustomEnd] = useState(getDefaultEndDate());

  const activeRange = useMemo(() => {
    if (range === "custom") {
      return {
        start: parseDateKey(customStart) ?? parseDateKey(getDefaultStartDate(30))!,
        end: parseDateKey(customEnd) ?? parseDateKey(getDefaultEndDate())!,
      };
    }

    const days = Number(range);
    return {
      start: parseDateKey(getDefaultStartDate(days))!,
      end: parseDateKey(getDefaultEndDate())!,
    };
  }, [customEnd, customStart, range]);

  const chartData = useMemo(() => {
    const start =
      activeRange.start > activeRange.end ? activeRange.end : activeRange.start;
    const end =
      activeRange.start > activeRange.end ? activeRange.start : activeRange.end;
    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / dayMs) + 1
    );

    const rows = Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      return {
        date: toDateKey(date),
        volunteers: 0,
        organizations: 0,
        opportunities: 0,
        registrations: 0,
      };
    });

    const rowsByDate = new Map(rows.map((row) => [row.date, row]));

    events.forEach((event) => {
      const key = toDateKey(new Date(event.created_at));
      const row = rowsByDate.get(key);
      if (row) {
        row[event.type] += 1;
      }
    });

    return rows;
  }, [activeRange, events]);

  const maxValue = Math.max(
    1,
    ...chartData.flatMap((row) => seriesKeys.map((key) => row[key]))
  );

  const totalForRange = chartData.reduce(
    (totals, row) => {
      seriesKeys.forEach((key) => {
        totals[key] += row[key];
      });
      return totals;
    },
    {
      volunteers: 0,
      organizations: 0,
      opportunities: 0,
      registrations: 0,
    }
  );

  return (
    <Card className="border-white/70 bg-white/85 py-0 shadow-sm shadow-slate-950/5">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Platform activity
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Daily account, opportunity, and registration activity.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Range
              </span>
              <Tabs
                value={range}
                onValueChange={(value) =>
                  setRange(value as "7" | "30" | "custom")
                }
              >
                <TabsList className="h-10 border border-slate-200 bg-slate-50">
                  <TabsTrigger className="px-3" value="7">
                    7 days
                  </TabsTrigger>
                  <TabsTrigger className="px-3" value="30">
                    30 days
                  </TabsTrigger>
                  <TabsTrigger className="px-3" value="custom">
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {range === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start
                  </span>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End
                  </span>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chart
              </span>
              <div className="flex gap-2">
                <Button
                  variant={chartType === "bar" ? "default" : "outline"}
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="size-4" />
                  Bar
                </Button>
                <Button
                  variant={chartType === "line" ? "default" : "outline"}
                  onClick={() => setChartType("line")}
                >
                  <LineChart className="size-4" />
                  Line
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {seriesKeys.map((key) => (
            <div
              key={key}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: seriesConfig[key].color }}
                />
                <span className="text-xs font-semibold text-slate-500">
                  {seriesConfig[key].label}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {totalForRange[key]}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
          <AdminSvgChart
            chartData={chartData}
            chartType={chartType}
            maxValue={maxValue}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSvgChart({
  chartData,
  chartType,
  maxValue,
}: {
  chartData: Array<
    { date: string } & Record<AnalyticsSeriesKey, number>
  >;
  chartType: "line" | "bar";
  maxValue: number;
}) {
  const width = Math.max(760, chartData.length * 46);
  const height = 320;
  const padding = { top: 18, right: 18, bottom: 48, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const rowWidth = innerWidth / Math.max(1, chartData.length);
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxValue / 4) * index)
  );

  function getX(index: number) {
    return padding.left + rowWidth * index + rowWidth / 2;
  }

  function getY(value: number) {
    return padding.top + innerHeight - (value / maxValue) * innerHeight;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[320px] min-w-[760px] text-slate-500"
      role="img"
      aria-label="Platform activity chart"
    >
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={getY(tick)}
            y2={getY(tick)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 10}
            y={getY(tick) + 4}
            textAnchor="end"
            className="fill-slate-500 text-[11px]"
          >
            {tick}
          </text>
        </g>
      ))}

      {chartType === "bar" ? (
        chartData.map((row, rowIndex) => {
          const barWidth = Math.min(8, (rowWidth - 10) / seriesKeys.length);
          const groupStart =
            getX(rowIndex) - (barWidth * seriesKeys.length) / 2;
          return (
            <g key={row.date}>
              {seriesKeys.map((key, seriesIndex) => {
                const y = getY(row[key]);
                return (
                  <rect
                    key={key}
                    x={groupStart + seriesIndex * barWidth}
                    y={y}
                    width={barWidth - 1}
                    height={padding.top + innerHeight - y}
                    rx={2}
                    fill={seriesConfig[key].color}
                    opacity={0.88}
                  />
                );
              })}
            </g>
          );
        })
      ) : (
        seriesKeys.map((key) => {
          const points = chartData
            .map((row, index) => `${getX(index)},${getY(row[key])}`)
            .join(" ");
          return (
            <g key={key}>
              <polyline
                fill="none"
                stroke={seriesConfig[key].color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {chartData.map((row, index) => (
                <circle
                  key={`${key}-${row.date}`}
                  cx={getX(index)}
                  cy={getY(row[key])}
                  r={3}
                  fill={seriesConfig[key].color}
                />
              ))}
            </g>
          );
        })
      )}

      {chartData.map((row, index) => {
        const label = new Date(`${row.date}T00:00:00`).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" }
        );
        const shouldShow =
          chartData.length <= 14 || index % Math.ceil(chartData.length / 10) === 0;

        return (
          <text
            key={row.date}
            x={getX(index)}
            y={height - 16}
            textAnchor="middle"
            className={cn(
              "fill-slate-500 text-[11px]",
              !shouldShow && "hidden"
            )}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
