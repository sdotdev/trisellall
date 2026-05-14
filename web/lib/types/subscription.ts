export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface Subscription {
  id: string
  workspaceId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  createdAt: string
  updatedAt: string
}
