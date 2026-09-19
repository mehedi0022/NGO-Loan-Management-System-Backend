import { z } from "zod";
import { createUserSchema } from "./validations/user.validation";

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
