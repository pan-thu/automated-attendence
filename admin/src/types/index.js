export type User = {
  userId: string;
  email: string;
  role: "admin" | "employee";
  fullName?: string;
};
