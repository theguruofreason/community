import { Relationship } from "neo4j-driver";

class Person {
    uname?: string;
    email?: string;
    relationships?: Relationship[];
}

export const typeDefs = `#graphql
    type Person {
        uname: String!
        email: String
        addresses: String
        phones: String
        relationships: 
    }
`;