import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="z-10 w-full max-w-md glass p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6">
        <Logo className="w-28 h-28 object-contain" />

        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">KJ Sync Studio</h1>
          <p className="text-muted-foreground">Manage your projects and clients in real-time.</p>
        </div>

        <Link href="/login" className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] text-center block">
          Sign In
        </Link>

        <Link href="/portfolio" className="text-sm text-primary hover:underline">
          View our portfolio →
        </Link>

        <p className="text-sm text-muted-foreground mt-2">
          Contact an administrator to get an account.
        </p>
      </div>
    </div>
  );
}
