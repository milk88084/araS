export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="text-muted-foreground container mx-auto flex max-w-screen-xl items-center justify-between px-4 text-sm">
        <p>&copy; {new Date().getFullYear()} Production Template. All rights reserved.</p>
        <div className="flex gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
