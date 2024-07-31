import { Logger } from "pino";
import { Driver } from "neo4j-driver";
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            LOGIN_TABLE: string;
            NEO4J_CONNECTION_MAX_RETRIES: string;
            NEO4J_PW: string;
            NEO4J_UNAME: string;
            NEO4J_URI: string;
            ORIGIN: string;
            PINO_LOG_HTTP?: string;
            PINO_LOG_LEVEL: string;
            PORT?: string;
        }
    }
    namespace Express {
        export interface Request {
            logger: Logger;
            n4jDriver: Driver;
        }
    }
}

export {};
