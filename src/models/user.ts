export type UserRole = "admin" | "seller" | "support";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
}
