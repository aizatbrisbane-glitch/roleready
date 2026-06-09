import Stripe from "stripe";
import { getStripeConfig } from "@/lib/env";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;
  const config = getStripeConfig();
  if (!config) throw new Error("STRIPE_SECRET_KEY is not configured.");
  _stripe = new Stripe(config.secretKey, { apiVersion: "2026-05-27.dahlia" });
  return _stripe;
}
