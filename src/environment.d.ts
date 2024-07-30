declare global {
    namespace NodeJS {
        interface ProcessEnv {
            LOGIN_TABLE: string;
            NEO4J_CONNECTION_MAX_RETRIES: number;
            NEO4J_PW: string;
            NEO4J_UNAME: string;
            NEO4J_URI: string;
            ORIGIN: string;
            PINO_LOG_HTTP?: boolean;
            PINO_LOG_LEVEL: string;
            PORT?: number;
        }
    }
}

export {}