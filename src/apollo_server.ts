import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4jDriver } from 'db';
import { readFileSync } from 'fs';
const { APOLLO_PORT } = process.env;
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startNeo4JGraphQL(neo4JDriver: Neo4jDriver): Promise<void> {
    const typeDefs : string = await readFileSync(__dirname + "/types.graphql").toString("utf-8");
    const neoSchema: Neo4jGraphQL = new Neo4jGraphQL({ typeDefs, driver: neo4JDriver.getDriver()})
    const server = new ApolloServer({
        schema: await neoSchema.getSchema(),
    })
    const { url } = await startStandaloneServer(server, {
        context: async ({ req }) => ({ token: req.headers.authorization }),
        listen: { port: +(APOLLO_PORT ?? 4000) }
    })
    console.log(`🚀 Server ready at ${url}`)
}

export { startNeo4JGraphQL };