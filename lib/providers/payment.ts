export type CheckoutInput = { orderId: string; amount: number; currency: string; returnUrl: string };
export type CheckoutResult = { provider: string; status: "manual" | "created"; checkoutUrl: string | null; reference: string | null };

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
}

/** Dormant until a payment flag and provider integration are activated. */
export class ManualPaymentProvider implements PaymentProvider {
  async createCheckout(): Promise<CheckoutResult> { return { provider: "manual", status: "manual", checkoutUrl: null, reference: null }; }
  async verifyWebhookSignature(): Promise<boolean> { return false; }
}

export function getPaymentProvider(): PaymentProvider { return new ManualPaymentProvider(); }
