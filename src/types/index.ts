export interface User {
  id: string;
  username: string;
  name: string;
  role: 'Owner' | 'Manager' | 'Receptionist' | 'Staff';
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  dob?: string;
  totalSpend: number;
  visitCount: number;
  lastServiceDate?: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  phone: string;
  joiningDate: string;
  salary: number;
  status: 'Active' | 'Inactive';
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  duration?: number; // in minutes
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  supplierName: string;
  purchaseDate: string;
  expiryDate: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  type: 'PURCHASE' | 'SALE' | 'CONSUMPTION';
  quantity: number;
  date: string;
  // For PURCHASE
  costPrice?: number;
  supplierName?: string;
  // For SALE & CONSUMPTION
  sellingPrice?: number; // Only for SALE
  customerId?: number;
  customerName?: string;
  invoiceId?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerDob?: string;
  date: string;
  
  // Legacy support for older records, or we can just migrate
  serviceName?: string;
  servicePrice?: number;
  productName?: string;
  productPrice?: number;
  
  // New Arrays for ERP
  services: InvoiceItem[];
  soldProducts: InvoiceItem[];
  consumedProducts: InvoiceItem[]; // price is usually 0 here, but tracks what was used

  staffId: string;
  staffName: string;
  grandTotal: number;
}
export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card';
  status: 'Paid' | 'Pending' | 'Partially Paid';
}
