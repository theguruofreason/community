import { z } from "zod";
const { PASSWORD_MIN_LENGTH } = process.env;

export const UserInfoSchema = z.object({
    uname: z.string().nonempty(),
    email: z.string().email().optional(),
    pass: z.string().min(+PASSWORD_MIN_LENGTH),
    name: z.string().nonempty(),
    description: z.string().optional(),
    roles: z.number().array(),
    active: z.boolean(),
    creationDateTime: z.string().pipe(z.coerce.date()),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export const LoginSchema = z.object({
    uname: z.string().nonempty(),
    pass: z.string().min(+PASSWORD_MIN_LENGTH),
});

export type Login = z.infer<typeof LoginSchema>;

export type LoginDBSchema = {
    id: number,
    uname: string,
    pass: string,
}

export type TokenData = {
    uname: string,
    pass: string,
    roles: number[]
}