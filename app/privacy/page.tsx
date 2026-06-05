import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalDetails } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | ApplyHQ",
  description: "How ApplyHQ collects, uses and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${legalDetails.brandName} helps job seekers create tailored application documents and manage their job search. This policy explains how we handle personal information.`}
      sections={[
        {
          title: "Information we collect",
          body: [
            "We may collect account details, contact information, resumes, cover letters, job descriptions, application notes, generated documents and other information you provide while using ApplyHQ.",
            "We may also collect basic technical information such as device, browser, log and usage data to operate, secure and improve the service.",
          ],
        },
        {
          title: "How we use information",
          body: [
            "We use personal information to provide the product, tailor resumes and cover letters, manage your account, support application tracking, respond to support requests, improve the service and meet legal obligations.",
            "Resume and career information can be sensitive in practice. We treat it with care and use it only for service-related purposes.",
          ],
        },
        {
          title: "AI processing",
          body: [
            "ApplyHQ uses AI services to generate and tailor career documents. Information from your profile, uploaded documents and job ads may be sent to AI providers where needed to produce requested outputs.",
            "You should review all AI-generated content before using it in a job application.",
          ],
        },
        {
          title: "Disclosure",
          body: [
            "We may share information with service providers that help us host, secure, analyse, process payments for, or operate ApplyHQ. We may also disclose information if required by law or to protect the rights, safety and security of users or the service.",
          ],
        },
        {
          title: "Access and correction",
          body: [
            `You can request access to, correction of, or deletion of your personal information by contacting ${legalDetails.supportEmail}.`,
          ],
        },
      ]}
    />
  );
}
