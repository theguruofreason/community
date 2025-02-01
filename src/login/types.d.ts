export type Roles = number;

export interface LoginDBEntry {
    uname: string,
    pw: string,
    email: string,
    roles: number[]
}