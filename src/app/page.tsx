import { Button } from "@/components/ui/button";
import { Boxes } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-primary p-4 text-primary-foreground">
          <Boxes className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to NTBLCP Asset Manager
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A full-featured, offline-first web app to manage your assets efficiently.
        </p>
        <div>
          <Button size="lg">Start Managing Assets</Button>
        </div>
      </div>
    </main>
  );
}
