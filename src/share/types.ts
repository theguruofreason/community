import { z } from "zod";
const { PASSWORD_MIN_LENGTH, UNAME_MIN_LENGTH } = process.env;

export const UserInfoSchema = z.object({
    uname: z.string().nonempty().min(+UNAME_MIN_LENGTH),
    email: z.preprocess((email) => {
        if (email ==="") email = undefined;
    } , z.string().email().optional()),
    pass: z.string().min(+PASSWORD_MIN_LENGTH),
    name: z.string().nonempty(),
    description: z.string().optional(),
    roles: z.preprocess((roles) => {
        if (Array.isArray(roles)) return roles;
        if (typeof roles === "string")
            return roles.split(",").map((roleID) => +roleID);
    }, z.number().array()),
    active: z.boolean().optional().default(true),
    creationDateTime: z.coerce.date().optional().default(new Date()),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export const LoginSchema = z.object({
    uname: z.string().nonempty(),
    pass: z.string().min(+PASSWORD_MIN_LENGTH),
});

export type Login = z.infer<typeof LoginSchema>;

export type LoginDBSchema = {
    id: number;
    uname: string;
    pass: string;
    token: string;
};

export type TokenData = {
    id: number;
    uname: string;
    roles: string[];
};
