"use client";

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
import { updateOpportunity } from "@/lib/actions";
import {
  opportunityUpdateSchema,
  type OpportunityUpdateInput,
} from "@/lib/validators";
import {
  opportunityStatusLabels,
  opportunityVisibilityLabels,
} from "@/lib/opportunity-labels";
import type { VolunteerOpportunity } from "@/types/database";

interface EditOpportunityFormProps {
  opportunity: VolunteerOpportunity;
}

export function EditOpportunityForm({ opportunity }: EditOpportunityFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityUpdateInput>({
    resolver: zodResolver(opportunityUpdateSchema),
    defaultValues: {
      title: opportunity.title,
      description: opportunity.description ?? "",
      date: opportunity.date,
      start_time: opportunity.start_time.slice(0, 5),
      end_time: opportunity.end_time.slice(0, 5),
      location: opportunity.location,
      experience_required: opportunity.experience_required ?? "",
      max_volunteers: opportunity.max_volunteers,
      visibility: opportunity.visibility ?? "public",
      status: opportunity.status,
    },
  });

  const status = watch("status");
  const visibility = watch("visibility");

  async function onSubmit(data: OpportunityUpdateInput) {
    const result = await updateOpportunity(opportunity.id, data);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                setValue("visibility", val as OpportunityUpdateInput["visibility"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: OpportunityUpdateInput["visibility"]) =>
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

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(val) =>
                setValue("status", val as OpportunityUpdateInput["status"])
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(value: OpportunityUpdateInput["status"]) =>
                    opportunityStatusLabels[value] ?? "Select status"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(opportunityStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Update Opportunity"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
