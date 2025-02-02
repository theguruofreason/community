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
    "FAMILY" |
    "FRIENDS" |
    "FOLLOWERS" |
    "MEMBERS" |
    "AFFILIATIONS";

export type Role =
    "USER" |
    "MODERATOR" |
    "ADMIN";

export type EntityLabels = 
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
    activationDateTime?: Date;
    deactivationDateTime?: Date;
    visibility: Visibility;
}

export interface Person extends Entity {
    familyOut?: Person[];
    familyIn?: Person[];
    following?: Person[];
    followedBy?: Person[];
    friendsOut?: Person[];
    friendsIn?: Person[];
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
    subject: Entity;
    object: Entity;
    descriptor?: string;
}

// Inputs
export interface EstablishRelationshipInput {
    subjectId: UUID;
    objectId: UUID;
    relationshipType: RelationshipType;
    descriptor?: string;
}

export interface EntityLookupArgs {
    id?: string;
    name?: string;
    labels?: EntityLabels[];
    active?: boolean;
    before?: Date;
    after?: Date;
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
    content: z.string()
})

export type AuthorTextPost = z.infer<typeof authorTextPostSchema> & {
    creationDateTime: number
}