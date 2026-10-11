import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function getCurrentUser(request: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
