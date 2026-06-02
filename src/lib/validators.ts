import { z } from "zod";

export const organizationApplicationSchema = z.object({
  organization_name: z.string().min(1, "Organization name is required"),
  contact_first_name: z.string().min(1, "First name is required"),
  contact_last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid website URL").optional().or(z.literal("")),
  mission: z.string().optional(),
  reason: z.string().min(1, "Please tell us why your organization wants to join"),
});

export const volunteerSignupSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    volunteer_interests: z
      .string()
      .min(10, "Tell us a little about what you care about"),
    volunteer_availability: z
      .string()
      .min(5, "Tell us when you are usually available"),
    volunteer_goals: z
      .string()
      .min(10, "Tell us what kind of volunteer experience you want"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const opportunityFieldsSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    location: z.string().min(1, "Location is required"),
    experience_required: z.string().optional(),
    max_volunteers: z.number().min(1, "At least 1 volunteer spot required"),
    visibility: z.enum(["public", "private"]),
    signup_mode: z.enum(["open", "application"]),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

export const opportunityCreateSchema = opportunityFieldsSchema;

export const opportunityUpdateSchema = opportunityFieldsSchema.extend({
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});

export const assignVolunteerSchema = z.object({
  opportunity_id: z.string().uuid(),
  volunteer_id: z.string().uuid(),
});

export const bookingRequestSchema = z.object({
  opportunity_id: z.string().uuid("Opportunity ID is required"),
  volunteer_note: z.string().optional(),
});

export const adminBookingUpdateSchema = z.object({
  admin_note: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type OrganizationApplicationInput = z.infer<
  typeof organizationApplicationSchema
>;
export type VolunteerSignupInput = z.infer<typeof volunteerSignupSchema>;
export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
