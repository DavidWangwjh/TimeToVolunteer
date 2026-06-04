"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createOpportunity } from "@/lib/actions";
import {
  opportunityCreateSchema,
  type OpportunityCreateInput,
} from "@/lib/validators";
import {
  clearOpportunityDraft,
  loadOpportunityDraft,
  saveOpportunityDraft,
  type OpportunityDraft,
} from "@/lib/opportunity-draft";
import { opportunityVisibilityLabels } from "@/lib/opportunity-labels";

const defaultValues: OpportunityCreateInput = {
  title: "",
  description: "",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  experience_required: "",
  max_volunteers: 1,
  visibility: "public",
};

type CreateOpportunityInitialValues = Partial<OpportunityCreateInput>;

function toDraft(values: OpportunityCreateInput): OpportunityDraft {
  return {
    title: values.title ?? "",
    description: values.description ?? "",
    date: values.date ?? "",
    start_time: values.start_time ?? "",
    end_time: values.end_time ?? "",
    location: values.location ?? "",
    experience_required: values.experience_required ?? "",
    max_volunteers: values.max_volunteers ?? 1,
    visibility: values.visibility ?? "public",
  };
}

export function CreateOpportunityForm({
  initialValues,
}: {
  initialValues?: CreateOpportunityInitialValues;
}) {
  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "published" | null>(
    null
  );
  const skipDraftSave = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OpportunityCreateInput>({
    resolver: zodResolver(opportunityCreateSchema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
  });

  const values = watch();
  const visibility = watch("visibility");

  useEffect(() => {
    if (initialValues) {
      clearOpportunityDraft();
      reset({
        ...defaultValues,
        ...initialValues,
      });
      setShowDraftNotice(false);
      return;
    }

    const draft = loadOpportunityDraft();
    if (draft) {
      reset({
        ...defaultValues,
        ...draft,
      });
      setShowDraftNotice(true);
    }
  }, [initialValues, reset]);

  useEffect(() => {
    const subscription = watch((formValues) => {
      if (skipDraftSave.current) return;
      saveOpportunityDraft(toDraft(formValues as OpportunityCreateInput));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    return () => {
      if (skipDraftSave.current) return;
      saveOpportunityDraft(toDraft(values));
    };
  }, [values]);

  async function onSubmit(
    data: OpportunityCreateInput,
    status: "draft" | "published"
  ) {
    setPendingAction(status);
    skipDraftSave.current = true;
    clearOpportunityDraft();
    setShowDraftNotice(false);

    const result = await createOpportunity(data, status);
    if (result?.error) {
      skipDraftSave.current = false;
      setPendingAction(null);
      saveOpportunityDraft(toDraft(data));
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {showDraftNotice && (
          <p className="text-sm text-muted-foreground mb-4 rounded-lg bg-slate-50 border px-3 py-2">
            Restored your unsaved progress from a previous visit.
          </p>
        )}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" type="time" {...register("start_time")} />
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" type="time" {...register("end_time")} />
              {errors.end_time && (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input id="location" {...register("location")} />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experience_required">Required Experience</Label>
              <Input id="experience_required" {...register("experience_required")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_volunteers">Max Volunteers *</Label>
              <Input
                id="max_volunteers"
                type="number"
                min={1}
                {...register("max_volunteers", { valueAsNumber: true })}
              />
              {errors.max_volunteers && (
                <p className="text-sm text-destructive">
                  {errors.max_volunteers.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(val) =>
                setValue("visibility", val as OpportunityCreateInput["visibility"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: OpportunityCreateInput["visibility"]) =>
                    opportunityVisibilityLabels[value] ?? "Select visibility"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(opportunityVisibilityLabels).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pendingAction !== null}
              onClick={handleSubmit((data) => onSubmit(data, "draft"))}
            >
              {pendingAction === "draft" ? "Saving..." : "Save and Exit"}
            </Button>
            <Button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleSubmit((data) => onSubmit(data, "published"))}
            >
              {pendingAction === "published" ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
