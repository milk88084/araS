import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { isClerkEnabled } from "@/lib/clerk";

const features = [
  {
    title: "Clerk Authentication",
    description: "Secure user auth with role-based access control (admin, editor, viewer).",
  },
  {
    title: "Type-Safe API",
    description: "Express REST API with Zod validation and shared schemas across client/server.",
  },
  {
    title: "Prisma ORM",
    description: "PostgreSQL with Prisma 6, migrations, soft deletes, and full type safety.",
  },
  {
    title: "Full Test Suite",
    description: "Vitest + Supertest for unit/integration, Playwright for E2E, 80% coverage target.",
  },
  {
    title: "Production Security",
    description: "OWASP-compliant with Helmet, CORS, CSP, rate limiting, and input validation.",
  },
  {
    title: "Pino Monitoring",
    description: "Structured logging with metrics, P95 tracking, and configurable alert thresholds.",
  },
];

export function HomePage() {
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-16">
      <section className="flex flex-col items-center gap-6 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Production
          <br />
          <span className="text-muted-foreground">Template</span>
        </h1>
        <p className="max-w-[42rem] text-muted-foreground leading-normal sm:text-xl sm:leading-8">
          A production-ready React + Express starter with Clerk auth, Prisma ORM,
          and comprehensive testing. Clone and start shipping.
        </p>
        <div className="flex gap-4">
          {isClerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg">Get Started</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link to="/posts">
                  <Button size="lg">Go to Posts</Button>
                </Link>
              </SignedIn>
            </>
          ) : (
            <Link to="/posts">
              <Button size="lg">Go to Posts</Button>
            </Link>
          )}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="lg">
              GitHub
            </Button>
          </a>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
