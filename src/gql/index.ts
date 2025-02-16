/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { readFileSync } from 'fs';
import path from "path";
import { ManagedTransaction, QueryResult, Session } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { Entity, EntityLookupArgs, EstablishRelationshipArgs, Person, Post, PostsByAuthorIdArgs, Relationship, RelationshipType, AuthorTextPostArgs, TextPost, ENTITY_LABELS, EntityLabel } from "./types.js";
import { UUID } from "crypto";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EntityResult {
    properties: Entity;
    labels: string[];
}

function createPropertiesString(args: object): string {
    return Object.keys(args).map((key) => `${key}: $${key}`).join(", ");
}

function lookupPeople(args: object, session: Session) : Promise<Person[]> {
    const p = 'p';
    const cypher = `MATCH (${p}:Person {${createPropertiesString(args)}}) RETURN ${p};`;
    return session.executeRead<Person[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[p]: {properties: Person}}> = await tx.run(cypher, args);
        return result.records.map(record => record.get(p).properties);
    });
}

function lookupRelatedEntities(primaryId: UUID, session: Session, relationshipTypes?: RelationshipType[], descriptorSearch?: string) : Promise<Entity[]> {
    const [p, r, s] = ['p' as const, 'r' as const, 's' as const];
    const relationshipTypesString: string = relationshipTypes ? ":" + relationshipTypes.join("|") : "";
    const cypher = `MATCH (${p} {id: $primaryId})-[${r}${relationshipTypesString}]-(${s})`;
    if (descriptorSearch) {
        cypher.concat(` WHERE ${r}.descriptor =~ '${descriptorSearch}`);
    }
    return session.executeRead<Entity[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[p]: EntityResult; [r]: {properties: Relationship}; [s]: {properties: Entity}}> = await tx.run(cypher, { primaryId: primaryId });
        return result.records.map(record => record.get(s).properties);
    });
}

function lookupEntities(args: EntityLookupArgs, session: Session): Promise<Entity[]> {
    const {before, after, labels} = args;
    delete args.labels;
    const e = 'e';
    const entityLabelsString: string = labels ? ":" + labels.join("|") : "";
    const matchString = `MATCH (${e}${entityLabelsString} {${createPropertiesString(args)}})`;
    const clauses: string[] = [];
    if (args.before ?? args.after) {
        if (before) {
            clauses.push(`${e}.creationDateTime < $before`);
        }
        if (after) {
            clauses.push(`${e}.creationDateTime > $after`);
        }
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const cypher = `${matchString} ${whereString} RETURN ${e}`;
    return session.executeRead<Entity[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[e]: EntityResult}> = await tx.run(cypher, args);
        return result.records.map(record => record.get(e).properties);
    });
}

async function getPostsByAuthorId(authorId: string, args: PostsByAuthorIdArgs, session: Session): Promise<Post[]> {
    const {types, before, after} = args;
    delete args.types;
    const [a, p, r] = ["a" as const, "p" as const, "r" as const];
    const typesString: string = types ? ":" + types.join("|") : "";
    const matchString = `MATCH (${a} {id: $authorId})-[${r}:AUTHORED]->(${p}${typesString})`
    const clauses: string[] = [];
    
    // Add clauses if present
    if (before) {
        clauses.push(`${r}.creationDateTime < $before`);
    }
    if (after) {
        clauses.push(`${r}.creationDateTime > $after`);
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const cypher = `${matchString} ${whereString} RETURN ${p}`;
    return session.executeRead<Post[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[p]: {properties: Post}}> = await tx.run(cypher, {...args, authorId});
        return result.records.map(record => record.get(p).properties);
    });
}

function authorTextPost(args: AuthorTextPostArgs, session: Session): Promise<TextPost> {
    const [p, r, tp] = ['p' as const, 'r' as const, 'tp' as const];
    args.creationDateTime = new Date().getTime();
    if (!("activationDateTime" in args)) args.activationDateTime = args.creationDateTime;
    const cypher = `MATCH (${p} {id: $authorId})
    CREATE (${tp}:Post:TextPost {creationDateTime: $creationDateTime, activationDateTime: $activationDateTime, deactivationDateTime: $deactivationDateTime, visibility: $visibility, content: $content})
    CREATE (${p})-[${r}:AUTHORED]->(${tp})
    RETURN ${tp};`
    return session.executeWrite<TextPost>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[tp]: {properties: TextPost}}> = await tx.run(cypher, args);
        return result.records[0].get(tp).properties;
    });
}

function establishRelationship(args: EstablishRelationshipArgs, session: Session) : Promise<Relationship> {
    const [s, r, o] = ['s' as const, 'r' as const, 'o' as const];
    const matchString = `MATCH (${s} {id: $subjectId}) MATCH (${o} {id: $objectId})`;
    const descriptionString: string = args.descriptor ? `{descriptor: $descriptor}` : "";
    const relationshipString = `MERGE (${s})-[${r}:${args.relationshipType} ${descriptionString}]->(${o})`;
    const cypher = `${matchString} ${relationshipString} RETURN ${s}, ${o}, ${r};`;
    return session.executeWrite<Relationship>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[s]: EntityResult; [r]: {properties: Relationship}; [o]: EntityResult}> = await tx.run(cypher, args);
        const subject = result.records[0].get(s);
        const object = result.records[0].get(o);
        const relationship = result.records[0].get(r);
        return {
            subject: {
                ...subject.properties,
                __typename: subject.labels.find(label => ENTITY_LABELS.includes(label)) as EntityLabel
            },
            object: {
                ...object.properties,
                __typename: object.labels.find(label => ENTITY_LABELS.includes(label)) as EntityLabel
            },
            descriptor: relationship.properties.descriptor
        };
    });
}

interface Context { n4jDriver: { session: () => Session; }; }

const resolvers = {
    Query: {
        people: (root, args: object, context: Context, info) => lookupPeople(args, context.n4jDriver.session()),
        posts: (root, args: PostsByAuthorIdArgs, context: Context, info) => getPostsByAuthorId(args.authorId, args, context.n4jDriver.session()),
        entities: (root, args: EntityLookupArgs, context: Context, info) => lookupEntities(args, context.n4jDriver.session())
    },
    Mutation: {
        authorTextPost: (root, args: AuthorTextPostArgs, context: Context, info) => authorTextPost(args, context.n4jDriver.session()),
        establishRelationship: (root, args: EstablishRelationshipArgs, context: Context, info) => establishRelationship(args, context.n4jDriver.session())
    },
    Person: {
        posts: (author: { id: string; }, args: PostsByAuthorIdArgs, context: Context, info) => getPostsByAuthorId(author.id, args, context.n4jDriver.session()),
        // familyOut: (primary, args, context, info) => lookupPeople
    }
}

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = makeExecutableSchema({typeDefs, resolvers});

export const handler = createHandler({
    schema: schema,
    context: req => ({
        n4jDriver: req.raw.n4jDriver
    }),
})
