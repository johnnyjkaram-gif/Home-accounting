import withAuth from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // Protect everything except auth routes, register, static assets and api/auth.
  matcher: [
    '/((?!api/auth|api/register|login|register|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
};
