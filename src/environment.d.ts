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
            /**
             * The Unique Resource Identifier for the login database containing login information
             */
            LOGIN_DB_URI: string;
            /**
             * The name of the table in the login database which contains login information
             */
            LOGIN_TABLE: string;
            /**
             * The maximum number of times Community will retry connecting to the Neo4j instance
             */
            NEO4J_CONNECTION_MAX_RETRIES: string;
            /**
             * The password for the Neo4j user used to control the Neo4j database
             */
            NEO4J_PW: string;
            /**
             * The username for the Neo4j user used to control the Neo4j database
             */
            NEO4J_UNAME: string;
            /**
             * The Unique Resource Identifier of the Neo4j database
             */
            NEO4J_URI: string;
            /**
             * The domain of the current Community instance
             */
            ORIGIN: string;
            PINO_LOG_LEVEL: string;
            /**
             * The port of the current Community instance
             */
            PORT?: string;
            /**
             * The secret value for generating and verifying user session tokens
             */
            TOKEN_SECRET: string;
            /**
             * The Initialization Vector for encrypting user session tokens
             */
            TOKEN_SECRET_IV: string;
            /**
             * The issuing party for use session tokens
             */
            TOKEN_ISSUER: string;
            TOKEN_MAX_AGE: string;
            ENCRYPTION_METHOD: string;
            /**
             * The environment which the current instance of Community is running in.
             * Valid values are: "dev", "prod"
             */
            RUNTIME_ENVIRONMENT: string;
            /**
             * The required minimum length of a password for a new registered user
             */
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