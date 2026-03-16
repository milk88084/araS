"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { isClerkEnabled } from "../../lib/clerk";

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            Production Template
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            {isClerkEnabled ? (
              <SignedIn>
                <Link
                  href="/posts"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Posts
                </Link>
              </SignedIn>
            ) : (
              <Link
                href="/posts"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Posts
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isClerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Clerk not configured</span>
          )}
        </div>
      </div>
    </header>
  );
}
