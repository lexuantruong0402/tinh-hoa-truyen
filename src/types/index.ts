export type Theme = "light" | "dark" | "sepia";
export type FontType = "serif" | "sans";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface Story {
  title: string;
  content: string;
  rawUrl: string;
  nextUrl?: string | null;
  prevUrl?: string | null;
}

export interface ReadingHistory {
  id: string;
  storyName: string;
  chapterName: string;
  url: string;
  sourceHost: string;
  userId: string;
  createdAt: any;
  updatedAt?: any;
}

export interface ParsedReadingInfo {
  storyName: string;
  chapterName: string;
  sourceHost: string;
}