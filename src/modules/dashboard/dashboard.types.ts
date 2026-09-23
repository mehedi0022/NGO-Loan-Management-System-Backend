import { z } from "zod";

import { dashboardSummaryQuerySchema } from "./validations/dashboard.validation.js";

export type DashboardSummaryQuery = z.infer<
  typeof dashboardSummaryQuerySchema
>["query"];
