import { Request } from "express"
const log = require("pino-http")();

export interface RequestWithLogger extends Request {
    log: typeof log;
} 