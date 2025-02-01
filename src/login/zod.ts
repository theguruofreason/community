import {z} from "zod";

export const loginRequestSchema = z.object({
    uname: z.string(),
    pass: z.string()
})