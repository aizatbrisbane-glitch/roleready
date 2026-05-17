import { BriefcaseBusiness } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600/10">
          <BriefcaseBusiness className="h-6 w-6 text-teal-600" />
        </div>
        <p className="text-sm text-stone-500">AI Job Search Assistant</p>
      </div>
      <AuthPanel />
    </main>
  );
}
