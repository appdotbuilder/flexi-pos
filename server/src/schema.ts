import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum(['CASHIER', 'INVENTORY_MANAGER', 'ADMINISTRATOR', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const transactionTypeSchema = z.enum(['RETAIL', 'WHOLESALE']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionStatusSchema = z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'RETURNED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const orderStatusSchema = z.enum(['PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schemas for users
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleSchema,
  first_name: z.string(),
  last_name: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  role: userRoleSchema.optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Warehouse schema
export const warehouseSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Warehouse = z.infer<typeof warehouseSchema>;

export const createWarehouseInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable()
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseInputSchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  retail_price: z.number(),
  wholesale_price: z.number(),
  cost_price: z.number(),
  barcode: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  retail_price: z.number().positive(),
  wholesale_price: z.number().positive(),
  cost_price: z.number().positive(),
  barcode: z.string().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Inventory schema
export const inventorySchema = z.object({
  id: z.number(),
  product_id: z.number(),
  warehouse_id: z.number(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  reorder_level: z.number().int(),
  updated_at: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

export const updateInventoryInputSchema = z.object({
  product_id: z.number(),
  warehouse_id: z.number(),
  quantity: z.number().int(),
  reorder_level: z.number().int().optional()
});

export type UpdateInventoryInput = z.infer<typeof updateInventoryInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  customer_type: transactionTypeSchema,
  credit_limit: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  customer_type: transactionTypeSchema,
  credit_limit: z.number().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Sales Transaction schema
export const salesTransactionSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  cashier_id: z.number(),
  transaction_type: transactionTypeSchema,
  status: transactionStatusSchema,
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  payment_method: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type SalesTransaction = z.infer<typeof salesTransactionSchema>;

export const createSalesTransactionInputSchema = z.object({
  customer_id: z.number().nullable(),
  transaction_type: transactionTypeSchema,
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  payment_method: z.string(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    total_price: z.number().positive()
  }))
});

export type CreateSalesTransactionInput = z.infer<typeof createSalesTransactionInputSchema>;

// Sales Transaction Item schema
export const salesTransactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number()
});

export type SalesTransactionItem = z.infer<typeof salesTransactionItemSchema>;

// Purchase Order schema
export const purchaseOrderSchema = z.object({
  id: z.number(),
  supplier_name: z.string(),
  supplier_email: z.string().email().nullable(),
  supplier_phone: z.string().nullable(),
  warehouse_id: z.number(),
  status: orderStatusSchema,
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const createPurchaseOrderInputSchema = z.object({
  supplier_name: z.string(),
  supplier_email: z.string().email().nullable(),
  supplier_phone: z.string().nullable(),
  warehouse_id: z.number(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_cost: z.number().positive(),
    total_cost: z.number().positive()
  }))
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;

// Purchase Order Item schema
export const purchaseOrderItemSchema = z.object({
  id: z.number(),
  purchase_order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_cost: z.number(),
  total_cost: z.number()
});

export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

// Shipping schema
export const shippingSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  shipping_address: z.string(),
  tracking_number: z.string().nullable(),
  carrier: z.string().nullable(),
  shipping_cost: z.number(),
  estimated_delivery: z.coerce.date().nullable(),
  actual_delivery: z.coerce.date().nullable(),
  status: orderStatusSchema,
  created_at: z.coerce.date()
});

export type Shipping = z.infer<typeof shippingSchema>;

export const createShippingInputSchema = z.object({
  transaction_id: z.number(),
  shipping_address: z.string(),
  tracking_number: z.string().nullable(),
  carrier: z.string().nullable(),
  shipping_cost: z.number(),
  estimated_delivery: z.coerce.date().nullable()
});

export type CreateShippingInput = z.infer<typeof createShippingInputSchema>;

// Accounts Receivable schema
export const accountsReceivableSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  transaction_id: z.number(),
  amount: z.number(),
  due_date: z.coerce.date(),
  status: paymentStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AccountsReceivable = z.infer<typeof accountsReceivableSchema>;

// Accounts Payable schema
export const accountsPayableSchema = z.object({
  id: z.number(),
  purchase_order_id: z.number(),
  supplier_name: z.string(),
  amount: z.number(),
  due_date: z.coerce.date(),
  status: paymentStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AccountsPayable = z.infer<typeof accountsPayableSchema>;

// Sales Commission schema
export const salesCommissionSchema = z.object({
  id: z.number(),
  cashier_id: z.number(),
  transaction_id: z.number(),
  commission_rate: z.number(),
  commission_amount: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  is_paid: z.boolean(),
  created_at: z.coerce.date()
});

export type SalesCommission = z.infer<typeof salesCommissionSchema>;

// Reports input schemas
export const salesReportInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  cashier_id: z.number().optional(),
  transaction_type: transactionTypeSchema.optional()
});

export type SalesReportInput = z.infer<typeof salesReportInputSchema>;

export const inventoryReportInputSchema = z.object({
  warehouse_id: z.number().optional(),
  low_stock_only: z.boolean().optional()
});

export type InventoryReportInput = z.infer<typeof inventoryReportInputSchema>;

// Login schema
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;