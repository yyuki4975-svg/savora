export type SubmissionState = "Draft" | "Submitted" | "InReview" | "NeedsChanges" | "Approved" | "Rejected";
export interface SubmissionContent {
  title: string; locale: string; place: string; story: string; servings: number;
  ingredients: { name: string; quantity: string }[];
  steps: string[]; sources: string[]; rightsConfirmed: boolean;
  details?: { localName: string; country: string; region: string; city: string; kind: string; allergens: string; dietary: string; sourcesText: string };
}
export interface SubmissionResponse {
  id: string; state: SubmissionState; revision: number; version: number;
  content: SubmissionContent; reviewerAssigned: boolean; updatedAt: string;
  publication?: { recipeSlug: string; withdrawn: boolean } | null;
}
export interface SubmissionEvent {
  revision: number; from: SubmissionState | null; to: SubmissionState; reason: string | null; createdAt: string;
}
