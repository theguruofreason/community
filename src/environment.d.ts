/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { Driver } from "neo4j-driver";
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            LOGIN_DB_URI: string;
            LOGIN_TABLE: string;
            NEO4J_CONNECTION_MAX_RETRIES: string;
            NEO4J_PW: string;
            NEO4J_UNAME: string;
            NEO4J_URI: string;
            ORIGIN: string;
            PINO_LOG_LEVEL: string;
            PORT?: string;
            TOKEN_SECRET: string;
            TOKEN_MAX_AGE?: string;
            TOKEN_ISSUER: string;
            RUNTIME_ENVIRONMENT: string;
            PASSWORD_MIN_LENGTH: string;
        }
    }
    namespace Express {
        export interface Request {
            n4jDriver: Driver;
        }
    }
}

export {};
