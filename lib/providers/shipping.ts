export type ShippingOption = { id: string; label: string; amount: number; currency: string; eta: string | null };
export type ShipmentInput = { orderId: string; optionId: string; address: Record<string, string> };
export type ShipmentResult = { provider: string; status: "manual" | "booked"; trackingNumber: string | null; trackingUrl: string | null };

export interface ShippingProvider {
  getShippingOptions(input: { orderId: string; country: string }): Promise<ShippingOption[]>;
  bookShipment(input: ShipmentInput): Promise<ShipmentResult>;
}

/** Manual fulfilment seam; carrier rating and booking remain deferred. */
export class ManualShippingProvider implements ShippingProvider {
  async getShippingOptions(): Promise<ShippingOption[]> { return []; }
  async bookShipment(): Promise<ShipmentResult> { return { provider: "manual", status: "manual", trackingNumber: null, trackingUrl: null }; }
}

export function getShippingProvider(): ShippingProvider { return new ManualShippingProvider(); }
