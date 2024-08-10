import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4JDriver } from 'db';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
const { APOLLO_PORT } = process.env;

const GraphQL_Loader = new GraphQLFileLoader();
const typeDefs = GraphQL_Loader.loadSync("./types.gql", {})[0].rawSDL!;


async function startNeo4JGraphQL(neo4JDriver: Neo4JDriver): Promise<void> {
    const neoSchema: Neo4jGraphQL = new Neo4jGraphQL({typeDefs, driver: neo4JDriver.getDriver()})
    const server = new ApolloServer({
        schema: await neoSchema.getSchema(),
    })
    const { url } = await startStandaloneServer(server, {
        listen: { port: +APOLLO_PORT | 4000 }
    })
    console.log(`🚀 Server ready at ${url}`)
}