import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface Company extends RecordModel {
  name: string
  tax_id?: string
  status: string
}

export interface Module extends RecordModel {
  name: string
  endpoint_url?: string
  access_url?: string
  secret_key_name?: string
  base_price: number
  status: string
}

export interface Subscription extends RecordModel {
  user_id: string
  module_id: string
  status: string
  price?: number
  asaas_customer_id?: string
  asaas_subscription_id?: string
  expand?: {
    user_id?: User
    module_id?: Module
  }
}

export interface SyncLog extends RecordModel {
  subscription_id: string
  status: string
  error_message?: string
  expand?: {
    subscription_id?: Subscription
  }
}

export interface Settings extends RecordModel {
  name: string
  logo?: string
}

export interface User extends RecordModel {
  name: string
  email: string
  role: string
  person_type?: 'PF' | 'PJ'
  tax_id?: string
  company_name?: string
  postal_code?: string
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

export const getUser = async (id: string) => pb.collection<User>('users').getOne(id)
export const updateUser = async (id: string, data: Partial<User>) =>
  pb.collection('users').update(id, data)

export const getUsers = async () => pb.collection<User>('users').getFullList()

export const createUser = async (data: Partial<User>) => pb.collection('users').create(data)

export const createSubscription = async (data: Partial<Subscription>) =>
  pb.collection('subscriptions').create(data)

export const updateSubscription = async (id: string, data: Partial<Subscription>) =>
  pb.collection('subscriptions').update(id, data)

export const getSubscriptions = async () =>
  pb.collection<Subscription>('subscriptions').getFullList({ expand: 'user_id,module_id' })

export const getSyncLogs = async () =>
  pb.collection<SyncLog>('sync_logs').getFullList({
    sort: '-created',
    expand: 'subscription_id.user_id,subscription_id.module_id',
  })

export const getModules = async () => pb.collection<Module>('modules').getFullList()

export const createModule = async (data: Partial<Module>) => pb.collection('modules').create(data)

export const updateModule = async (id: string, data: Partial<Module>) =>
  pb.collection('modules').update(id, data)

export const getUserSubscriptions = async (userId: string) =>
  pb.collection<Subscription>('subscriptions').getFullList({ filter: `user_id = '${userId}'` })

export const getSettings = async () => {
  const records = await pb.collection<Settings>('settings').getFullList()
  return records[0]
}

export const updateSettings = async (id: string, data: FormData | Partial<Settings>) =>
  pb.collection('settings').update(id, data)
