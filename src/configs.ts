import pino from "pino";

export const SALT_ROUNDS = 10;
export const LOGIN_TABLE = process.env.LOGIN_TABLE

export const PINO_CONFIG = {
    level: process.env.PINO_LOG_LEVEL || 'info',
    timeStamp: pino.stdTimeFunctions.isoTime,
}