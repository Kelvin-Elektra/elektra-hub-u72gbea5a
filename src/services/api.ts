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

export const getCompanies = async (): Promise<any[]> => {
  try {
    return await pb.collection('companies').getFullList()
  } catch (e) {
    return await pb.collection('users').getFullList()
  }
}

export const getSubscriptions = async (): Promise<Subscription[]> => {
  const records = await pb.collection('subscriptions').getFullList({
    expand: 'user_id,module_id',
    sort: '-created',
  })
  return records as unknown as Subscription[]
}

export const getSyncLogs = async (): Promise<any[]> => {
  return await pb.collection('sync_logs').getFullList({
    sort: '-created',
    expand: 'subscription_id',
  })
}

export const createModule = async (data: any): Promise<Module> => {
  return (await pb.collection('modules').create(data)) as unknown as Module
}

export const updateModule = async (id: string, data: any): Promise<Module> => {
  return (await pb.collection('modules').update(id, data)) as unknown as Module
}

export const getSettings = async (): Promise<any> => {
  const records = await pb.collection('settings').getFullList()
  return records.length > 0 ? records[0] : null
}

export const updateSettings = async (id: string, data: any): Promise<any> => {
  return await pb.collection('settings').update(id, data)
}

export const getEmployeeAccess = async (userId: string): Promise<any[]> => {
  const records = await pb.collection('employee_access').getFullList({
    filter: `employee_id = "${userId}"`,
    expand: 'module_id',
  })
  return records
}
