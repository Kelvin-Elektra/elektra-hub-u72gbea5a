import pb from '@/lib/pocketbase/client'

export interface Module {
  id: string
  name: string
  base_price: number
  status: 'active' | 'maintenance' | 'deprecated'
  access_url?: string
  description?: string
  logo?: string
  features?: string
}

export interface Subscription {
  id: string
  module_id: string
  user_id: string
  status: 'trialing' | 'active' | 'overdue' | 'canceled'
  price: number
  max_users?: number
  expand?: {
    user_id?: any
    module_id?: any
  }
}

export const getModules = async (): Promise<Module[]> => {
  const records = await pb.collection('modules').getFullList()
  return records as unknown as Module[]
}

export const getUserSubscriptions = async (userId: string): Promise<Subscription[]> => {
  const records = await pb.collection('subscriptions').getFullList({
    filter: `user_id = "${userId}"`,
    expand: 'module_id',
  })
  return records as unknown as Subscription[]
}
