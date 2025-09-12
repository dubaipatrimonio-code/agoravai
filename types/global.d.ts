declare global {
  interface Window {
    fbq: any
    trackAddPaymentInfo: () => void
    trackPurchase: (amount: number, orderId: string) => void
  }
}

export {}
