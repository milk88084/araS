import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../src/pages/HomePage";

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({ getToken: vi.fn() }),
}));

describe("HomePage", () => {
  it("renders the hero section", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Clerk Authentication")).toBeInTheDocument();
    expect(screen.getByText("Prisma ORM")).toBeInTheDocument();
    expect(screen.getByText("Pino Monitoring")).toBeInTheDocument();
  });
});
