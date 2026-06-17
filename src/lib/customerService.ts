import { supabase } from './supabase';
import type { Customer } from '../types';

export type CustomerInsert = Omit<Customer, 'id' | 'createdAt' | 'totalSpend' | 'visitCount'>;
export type CustomerUpdate = Partial<CustomerInsert> & {
  totalSpend?: number;
  visitCount?: number;
  lastServiceDate?: string;
};

export const customerService = {
  /**
   * Fetch all customers from Supabase
   */
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }

    // Map snake_case to camelCase
    const mappedCustomers: Customer[] = (data || []).map((d: any) => ({
      id: Number(d.id),
      name: String(d.name || 'Unknown'),
      phone: String(d.phone || ''),
      dob: d.dob ? String(d.dob) : undefined,
      totalSpend: Number(d.total_spent || 0),
      visitCount: Number(d.visit_count || 0),
      lastServiceDate: d.last_service_date ? String(d.last_service_date) : undefined,
      createdAt: String(d.created_at || new Date().toISOString())
    }));

    return mappedCustomers;
  },

  /**
   * Add a new customer
   */
  async addCustomer(customerData: CustomerInsert) {
    // Basic check for duplicate phone (optional, but good practice if not enforced by DB unique constraint)
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerData.phone)
      .single();

    if (existing) {
      throw new Error('A customer with this phone number already exists.');
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customerData.name,
        phone: customerData.phone,
        dob: customerData.dob || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      throw error;
    }

    return {
      id: Number(data.id),
      name: String(data.name || 'Unknown'),
      phone: String(data.phone || ''),
      dob: data.dob ? String(data.dob) : undefined,
      totalSpend: Number(data.total_spent || 0),
      visitCount: Number(data.visit_count || 0),
      lastServiceDate: data.last_service_date ? String(data.last_service_date) : undefined,
      createdAt: String(data.created_at || new Date().toISOString())
    } as Customer;
  },

  /**
   * Update an existing customer
   */
  async updateCustomer(id: number, updates: CustomerUpdate) {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.dob !== undefined) payload.dob = updates.dob || null;
    if (updates.totalSpend !== undefined) payload.total_spent = updates.totalSpend;
    if (updates.visitCount !== undefined) payload.visit_count = updates.visitCount;
    if (updates.lastServiceDate !== undefined) payload.last_service_date = updates.lastServiceDate;

    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw error;
    }

    return {
      id: Number(data.id),
      name: String(data.name || 'Unknown'),
      phone: String(data.phone || ''),
      dob: data.dob ? String(data.dob) : undefined,
      totalSpend: Number(data.total_spent || 0),
      visitCount: Number(data.visit_count || 0),
      lastServiceDate: data.last_service_date ? String(data.last_service_date) : undefined,
      createdAt: String(data.created_at || new Date().toISOString())
    } as Customer;
  },

  /**
   * Delete a customer
   */
  async deleteCustomer(id: number) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
    return true;
  }
};
