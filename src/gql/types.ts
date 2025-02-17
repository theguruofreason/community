import { UUID } from "crypto";
import { z } from "zod";

// String Literals

export type RelationshipType =  
    "FAMILY" |
    "FOLLOW" |
    "FRIEND" |
    "OWNERSHIP" |
    "EMPLOYMENT" |
    "MEMBERSHIP" |
    "AFFILIATION";

export type Visibility =
    "PUBLIC" |
    "FAMILY" |
    "FRIENDS" |
    "FOLLOWERS" |
    "MEMBERS" |
    "AFFILIATIONS";

export type Role =
    "USER" |
    "MODERATOR" |
    "ADMIN";

export type EntityLabel = 
    "Person" |
    "Place" |
    "Thing" |
    "Business" |
    "Group" |
    "Event";

export type PostType =
    "TextPost" |
    "ImagePost" |
    "AudioPost" |
    "VideoPost" |
    "LinkPost";

// Interfaces 
export interface Entity {
    __typename: string;
    id: string;
    name: string;
    creationDateTime: Date;
    active: boolean;
    description?: string;
}

export interface Address {
    line1: string;
    line2?: string;
    country: string;
    city: string;
    zip: number[];
}

export interface Place extends Entity {
    address: Address;
    ownedBy: Owner[];
    createdBy: UUID;
}

export interface ContactInformation {
    addresses?: Address[];
    phones?: string[];
    emails?: string[];
    socials?: string[];
}

export interface Event extends Entity {
    occuringOn: Date[];
    posts?: Post[];
    location?: Place;
    hosts: Entity[];
    attendants?: Entity[];
    contactInformation: ContactInformation;
    createdBy: Entity;
}

export interface Post {
    creationDateTime: Date;
    activationDateTime?: Date;
    deactivationDateTime?: Date;
    visibility: [Visibility];
    _typename: PostType
}

export interface TextPost extends Post {
    content: string;
}

export interface TextPostQueryResult {
    tp: {
        properties: TextPost;
    };
    r: {
        properties: {
            creationDateTime: Date;
        }
    }
}

export interface Person extends Entity {
    people?: Person[];
    things?: Thing[];
    jobs?: Business[];
    affiliations?: Group[];
    attending?: Event[];
    hosting?: Event[];
    creationDateTime: Date;
    active: boolean;
    description?: string;
    uname: string;
    contactInformation: ContactInformation;
    posts?: Post[];
    role: Role;
}

export interface EntityAndRelationship {
    entity: Entity & {__typename: EntityLabel};
    relationship: Relationship;
    direction: Direction;
}

type Owner = Person | Business | Group;

export interface Thing extends Entity {
    type?: string[];
    ownedBy: Owner[];
    createdBy: UUID;
}

export interface Business extends Entity {
    contactInformation?: ContactInformation;
    employs?: Person[];
    owns?: Thing[];
    affiliations?: Group | Business;
    events?: Event[];
    createdBy: UUID;
}

export interface Group extends Entity {
    posts?: Post[];
    affiliations?: Entity[];
    hostingEvents?: Event[];
    attendingEvents?: Event[];
    createdBy: UUID;
}

export interface Relationship {
    descriptor?: string;
}

export interface RelationshipPath extends Relationship {
    subject: Entity & {__typename: EntityLabel};
    object: Entity & {__typename: EntityLabel};
}


// Inputs
export interface EstablishRelationshipArgs {
    subjectId: UUID;
    objectId: UUID;
    relationshipType: RelationshipType;
    descriptor?: string;
}

export interface EntityLookupArgs {
    id?: string;
    name?: string;
    labels?: EntityLabel[];
    active?: boolean;
    before?: Date;
    after?: Date;
}

export type Direction = "OUT" | "IN" | "BIDIRECTIONAL";

export interface LookupRelatedEntitiesArgs {
    relationshipTypes?: RelationshipType[],
    descriptorSearch?: string,
    direction: Direction
}

export interface PostsByAuthorIdArgs {
    authorId: string;
    before?: Date;
    after?: Date;
    types?: PostType[];
}

export const ENTITY_LABELS: string[] = [
    "Person",
    "Place",
    "Thing",
    "Business",
    "Group",
    "Event"
]

export const POST_TYPES: string[] = [
    "TextPost",
    "ImagePost",
    "AudioPost",
    "VideoPost",
    "LinkPost"
]

export const authorTextPostSchema = z.object({
    deactivationDateTime: z.string().datetime().optional(),
    activationDateTime: z.number().optional(),
    content: z.string(),
    visibility: z.custom<Visibility>().array()
})

export type AuthorTextPostArgs = z.infer<typeof authorTextPostSchema> & {
    creationDateTime: number
}