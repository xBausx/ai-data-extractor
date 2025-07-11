// src/lib/auth.ts

import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { Lucia } from 'lucia'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { cache } from 'react'

// The PrismaAdapter is used to connect Lucia to our database.
// It handles all the database operations for sessions and users.
const adapter = new PrismaAdapter(db.session, db.user)

// This is the main Lucia instance.
export const lucia = new Lucia(adapter, {
  // sessionCookie defines the configuration for the session cookie.
  sessionCookie: {
    // httpOnly is no longer a configurable option; it is always true by default
    // for security. We have removed the line `httpOnly: true`.

    // expires is set to false, meaning the cookie will be a session cookie
    // that expires when the browser is closed.
    expires: false,
    // attributes for the cookie.
    attributes: {
      // secure is set to true in production, ensuring the cookie is only
      // sent over HTTPS.
      secure: process.env.NODE_ENV === 'production',
    },
  },
  // This function defines what user attributes are available on the
  // User object that Lucia provides.
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
    }
  },
})

// This is a crucial type declaration for Lucia.
// It tells Lucia what attributes are available on the User and Session objects.
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: DatabaseUserAttributes
  }
}

// This interface defines the shape of the user attributes we specified above.
interface DatabaseUserAttributes {
  username: string
}

// This function validates the session cookie from the request headers.
// It is wrapped in 'cache' to ensure it only runs once per request,
// even if called multiple times.
export const validateRequest = cache(async () => {
  // Get the session ID from the cookie.
  // ADD `await` before cookies()
  const sessionCookieStore = await cookies()
  const sessionId =
    sessionCookieStore.get(lucia.sessionCookieName)?.value ?? null

  if (!sessionId) {
    return {
      user: null,
      session: null,
    }
  }

  // Validate the session ID with Lucia.
  const result = await lucia.validateSession(sessionId)

  // Lucia automatically creates a new session cookie if the old one is about
  // to expire. We set this new cookie in the response headers.
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id)
      // Use the same awaited cookie store
      sessionCookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      )
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie()
      // Use the same awaited cookie store
      sessionCookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      )
    }
  } catch {
    // This can happen if the request is finished before the cookie is set.
    // It's safe to ignore.
  }

  return result
})
