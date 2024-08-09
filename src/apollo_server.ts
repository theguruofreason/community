import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4JDriver } from 'db';
const { APOLLO_PORT } = process.env;

const typeDefs = `#graphql
    type Person {
        uname: String
        email: String
        relationships: [Person!]! @relationship(type: Family)
    }
`

async function startNeo4JGraphQL(neo4JDriver: Neo4JDriver) {
    const neoSchema: Neo4jGraphQL = new Neo4jGraphQL({typeDefs, driver: neo4JDriver.getDriver()})
    const server = new ApolloServer({
        schema: await neoSchema.getSchema(),
    })
    const { url } = await startStandaloneServer(server, {
        listen: { port: +APOLLO_PORT | 4000 }
    })
    console.log(`🚀 Server ready at ${url}`)
}