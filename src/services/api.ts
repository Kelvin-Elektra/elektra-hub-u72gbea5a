import pb from '@/lib/pocketbase/client'

export interface Company {
  id: string
  name: string
  tax_id: string
  status: 'active' | 'inactive'
  created: string
}

export interface Module {
  id: string
  name: string
  endpoint_url: string
  secret_key_name: string
  base_price: number
  status: 'active' | 'maintenance' | 'deprecated'
}

export interface Subscription {
  id: string
  company_id: string
  module_id: string
  status: 'trialing' | 'active' | 'overdue' | 'canceled'
  price: number
  next_billing_date: string
  asaas_customer_id: string
  asaas_subscription_id: string
  expand?: {
    module_id?: Module
    company_id?: Company
  }
}

export interface SyncLog {
  id: string
  subscription_id: string
  status: 'success' | 'failed'
  error_message: string
  created: string
  expand?: {
    subscription_id?: Subscription
  }
}

export interface User {
  id: string
  name: string
  email: string
  company_id: string
  role: 'Admin' | 'User'
  created: string
  expand?: {
    company_id?: Company
  }
}

export const getCompanies = () =>
  pb.collection('companies').getFullList<Company>({ sort: '-created' })
export const getCompany = (id: string) => pb.collection('companies').getOne<Company>(id)
export const createCompany = (data: Partial<Company>) =>
  pb.collection('companies').create<Company>(data)
export const updateCompany = (id: string, data: Partial<Company>) =>
  pb.collection('companies').update<Company>(id, data)

export const getModules = () => pb.collection('modules').getFullList<Module>({ sort: '-created' })
export const createModule = (data: Partial<Module>) => pb.collection('modules').create<Module>(data)
export const updateModule = (id: string, data: Partial<Module>) =>
  pb.collection('modules').update<Module>(id, data)

export const getSubscriptions = () =>
  pb
    .collection('subscriptions')
    .getFullList<Subscription>({ expand: 'module_id,company_id', sort: '-created' })
export const getCompanySubscriptions = (companyId: string) =>
  pb
    .collection('subscriptions')
    .getFullList<Subscription>({ filter: `company_id = '${companyId}'`, expand: 'module_id' })
export const createSubscription = (data: Partial<Subscription>) =>
  pb.collection('subscriptions').create<Subscription>(data)
export const updateSubscription = (id: string, data: Partial<Subscription>) =>
  pb.collection('subscriptions').update<Subscription>(id, data)

export const getSyncLogs = () =>
  pb
    .collection('sync_logs')
    .getFullList<SyncLog>({
      expand: 'subscription_id,subscription_id.company_id,subscription_id.module_id',
      sort: '-created',
      requestKey: null,
    })

export const getUsers = () =>
  pb.collection('users').getFullList<User>({ expand: 'company_id', sort: '-created' })
export const getCompanyUsers = (companyId: string) =>
  pb.collection('users').getFullList<User>({ filter: `company_id = '${companyId}'` })
