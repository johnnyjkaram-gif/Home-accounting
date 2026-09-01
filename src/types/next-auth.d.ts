import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      householdId: string;
      baseCurrency: string;
    };
  }

  interface User {
    id: string;
    role: string;
    householdId: string;
    baseCurrency: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    householdId: string;
    baseCurrency: string;
  }
}
