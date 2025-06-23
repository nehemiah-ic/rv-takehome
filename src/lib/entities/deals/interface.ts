import { z } from "zod";

// Define Zod schema for DealData validation
export const DealDataSchema = z.object({
  deal_id: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  transportation_mode: z.enum(["trucking", "rail", "ocean", "air"]),
  stage: z.enum([
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ]),
  value: z.number().positive(),
  probability: z.number().min(0).max(100),
  created_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format for created_date",
  }),
  updated_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format for updated_date",
  }),
  expected_close_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format for expected_close_date",
  }),
  sales_rep: z.string(),
  origin_city: z.string(),
  destination_city: z.string(),
  cargo_type: z.string().optional(),
  territory: z.string().optional(),
});

// Export the inferred type for TypeScript usage
export type DealData = z.infer<typeof DealDataSchema>;
