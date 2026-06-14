import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalDetails } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy | Koalapply",
  description: "Refund information for Koalapply passes.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="This policy explains how refunds are handled for Koalapply paid passes."
      sections={[
        {
          title: "One-off passes",
          body: [
            "Koalapply paid plans are one-off passes rather than recurring subscriptions. There is no ongoing subscription to cancel.",
            "Pass details, including credit limits and access periods, are shown on the pricing page before purchase.",
          ],
        },
        {
          title: "Refund requests",
          body: [
            `If something goes wrong with your purchase or access, contact ${legalDetails.supportEmail} with your account email and payment details so we can review it.`,
            "Refunds are assessed case by case, including where there has been a billing error, duplicate payment, technical failure preventing use, or where consumer guarantees apply.",
          ],
        },
        {
          title: "Australian Consumer Law",
          body: [
            "Nothing in this policy limits rights you may have under the Australian Consumer Law or other applicable consumer protection laws.",
          ],
        },
      ]}
    />
  );
}
