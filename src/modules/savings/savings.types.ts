import { z } from "zod";

import { withdrawSavingsSchema } from "./validations/savings.validation.js";

export type WithdrawSavingsInput = z.infer<typeof withdrawSavingsSchema>["body"];
