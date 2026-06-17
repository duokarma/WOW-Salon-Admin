import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, Staff, Service, Product, Expense, InventoryLog, User } from '../types';

interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;

  customers: Customer[];
  staff: Staff[];
  services: Service[];
  products: Product[];
  expenses: Expense[];
  inventoryLogs: InventoryLog[];
  
  // Actions
  login: (username: string, password: string) => boolean;
  logout: () => void;
  
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: number, customer: Partial<Customer>) => void;
  deleteCustomer: (id: number) => void;
  addStaff: (staff: Staff) => void;
  updateStaffSalary: (id: string, salary: number) => void;
  updateProductStock: (id: string, newStock: number) => void;
  addPurchaseStock: (productId: string, quantity: number, costPrice: number, supplierName: string, notes: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

const initialCustomers: Customer[] = [];

const initialStaff: Staff[] = [];

const initialServices: Service[] = [];

const initialProducts: Product[] = [];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      
      customers: initialCustomers,
      staff: initialStaff,
      services: initialServices,
      products: initialProducts,
      expenses: [],
      inventoryLogs: [],

      login: (username, password) => {
        // Hardcoded admin logic as requested
        if (username === 'admin' && password === 'admin123') {
          set({
            isAuthenticated: true,
            currentUser: {
              id: 'u_1',
              username: 'admin',
              name: 'Admin',
              role: 'Owner'
            }
          });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false, currentUser: null }),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (id, updated) => set((state) => ({
        customers: state.customers.map((c) => c.id === id ? { ...c, ...updated } : c)
      })),
      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== id)
      })),
      addStaff: (staff) => set((state) => ({ staff: [...state.staff, staff] })),
      updateStaffSalary: (id, salary) => set((state) => ({
        staff: state.staff.map((s) => s.id === id ? { ...s, salary } : s)
      })),
      updateProductStock: (id, newStock) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, stockQuantity: newStock } : p)
      })),
      addPurchaseStock: (productId, quantity, costPrice, supplierName, notes) => set((state) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return state;

        const newLog: InventoryLog = {
          id: `log_purch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          productId,
          productName: product.name,
          type: 'PURCHASE',
          quantity,
          date: new Date().toISOString(),
          costPrice,
          supplierName
        };

        const newExpense: Expense = {
          id: `exp_purch_${Date.now()}`,
          title: `Stock Purchase: ${product.name} (Qty: ${quantity})`,
          amount: costPrice * quantity,
          category: 'Salon Products Purchase',
          date: new Date().toISOString(),
          paymentMethod: 'UPI', // Defaulting for auto-generation
          status: 'Paid',
          notes: notes || `Supplier: ${supplierName}`
        };

        return {
          products: state.products.map(p => p.id === productId ? { ...p, stockQuantity: p.stockQuantity + quantity } : p),
          inventoryLogs: [...state.inventoryLogs, newLog],
          expenses: [...state.expenses, newExpense]
        };
      }),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (id, updated) => set((state) => ({
        expenses: state.expenses.map((e) => e.id === id ? { ...e, ...updated } : e)
      })),
      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id)
      })),
    }),
    {
      name: 'wow-salon-storage',
    }
  )
);
