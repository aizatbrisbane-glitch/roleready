import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalDetails } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use | ApplyHQ",
  description: "Terms for using ApplyHQ.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={`These terms apply when you access or use ${legalDetails.brandName}.`}
      sections={[
        {
          title: "Use of the service",
          body: [
            "You must use ApplyHQ lawfully and provide accurate information where it matters, including when creating job application documents.",
            "You are responsible for reviewing, editing and approving any documents or suggestions before submitting them to employers or recruiters.",
          ],
        },
        {
          title: "AI-generated content",
          body: [
            "ApplyHQ may use AI to help draft, rewrite, summarise and tailor content. AI outputs can be incomplete, inaccurate or unsuitable for a particular role.",
            "We do not guarantee interviews, job offers or employment outcomes.",
          ],
        },
        {
          title: "Accounts and documents",
          body: [
            "You are responsible for keeping your account secure. Do not upload information you do not have permission to use.",
            "You retain ownership of your career documents and application materials. You give us permission to process them as needed to provide the service.",
          ],
        },
        {
          title: "Plans and access",
          body: [
            "Paid passes, credits and dashboard access periods are described on the pricing page at the time of purchase. Access can expire according to the plan selected.",
          ],
        },
        {
          title: "Contact",
          body: [
            `Questions about these terms can be sent to ${legalDetails.supportEmail}.`,
          ],
        },
      ]}
    />
  );
}
