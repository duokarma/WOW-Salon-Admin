import { supabase } from './supabase';
import type { Customer } from '../types';

export type CustomerInsert = Omit<Customer, 'id' | 'createdAt'>;
export type CustomerUpdate = Partial<CustomerInsert>;

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
      services_taken: d.services_taken || [],
      staff_served: d.staff_served || [],
      amountPaid: Number(d.amount_paid || 0),
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
        services_taken: customerData.services_taken || [],
        staff_served: customerData.staff_served || [],
        amount_paid: customerData.amountPaid || 0
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
      services_taken: data.services_taken || [],
      staff_served: data.staff_served || [],
      amountPaid: Number(data.amount_paid || 0),
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
    if (updates.services_taken !== undefined) payload.services_taken = updates.services_taken;
    if (updates.staff_served !== undefined) payload.staff_served = updates.staff_served;
    if (updates.amountPaid !== undefined) payload.amount_paid = updates.amountPaid;

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
      services_taken: data.services_taken || [],
      staff_served: data.staff_served || [],
      amountPaid: Number(data.amount_paid || 0),
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
