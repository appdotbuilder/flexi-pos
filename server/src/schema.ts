import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'SALES']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const transactionStatusSchema = z.enum(['DRAFT', 'FINAL', 'CANCELLED', 'RETURNED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const packingStatusSchema = z.enum(['NOT_PROCESSED', 'PROCESSED', 'READY_TO_SHIP', 'SHIPPED']);
export type PackingStatus = z.infer<typeof packingStatusSchema>;

export const salesTypeSchema = z.enum(['RETAIL', 'WHOLESALE', 'ONLINE']);
export type SalesType = z.infer<typeof salesTypeSchema>;

export const activityTypeSchema = z.enum(['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PURCHASE', 'SALE', 'RETURN', 'TRANSFER', 'PAYMENT']);
export type ActivityType = z.infer<typeof activityTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  store_id: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema,
  store_id: z.number().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Store schema
export const storeSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Store = z.infer<typeof storeSchema>;

export const createStoreInputSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable()
});

export type CreateStoreInput = z.infer<typeof createStoreInputSchema>;

// Warehouse schema
export const warehouseSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Warehouse = z.infer<typeof warehouseSchema>;

export const createWarehouseInputSchema = z.object({
  name: z.string(),
  location: z.string().nullable()
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseInputSchema>;

// Product Category schema
export const productCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

export const createProductCategoryInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategoryInputSchema>;

// Unit Conversion schema
export const unitConversionSchema = z.object({
  id: z.number(),
  name: z.string(),
  base_unit: z.string(),
  conversion_factor: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type UnitConversion = z.infer<typeof unitConversionSchema>;

export const createUnitConversionInputSchema = z.object({
  name: z.string(),
  base_unit: z.string(),
  conversion_factor: z.number().positive()
});

export type CreateUnitConversionInput = z.infer<typeof createUnitConversionInputSchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  barcode: z.string().nullable(),
  category_id: z.number(),
  unit_conversion_id: z.number(),
  cost_price: z.number(),
  selling_price: z.number(),
  wholesale_price: z.number(),
  minimum_stock: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  barcode: z.string().nullable(),
  category_id: z.number(),
  unit_conversion_id: z.number(),
  cost_price: z.number().nonnegative(),
  selling_price: z.number().positive(),
  wholesale_price: z.number().positive(),
  minimum_stock: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  credit_limit: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  credit_limit: z.number().nonnegative()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Supplier schema
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable()
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

// Employee schema
export const employeeSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  position: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  commission_rate: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Employee = z.infer<typeof employeeSchema>;

export const createEmployeeInputSchema = z.object({
  full_name: z.string(),
  position: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  commission_rate: z.number().min(0).max(100)
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

// Inventory schema
export const inventorySchema = z.object({
  id: z.number(),
  product_id: z.number(),
  warehouse_id: z.number(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  reorder_level: z.number().int(),
  last_updated: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

export const updateInventoryInputSchema = z.object({
  product_id: z.number(),
  warehouse_id: z.number(),
  quantity_change: z.number().int(),
  reason: z.string()
});

export type UpdateInventoryInput = z.infer<typeof updateInventoryInputSchema>;

// Purchase Order schema
export const purchaseOrderSchema = z.object({
  id: z.number(),
  supplier_id: z.number(),
  user_id: z.number(),
  order_date: z.coerce.date(),
  expected_delivery_date: z.coerce.date().nullable(),
  status: transactionStatusSchema,
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export const createPurchaseOrderInputSchema = z.object({
  supplier_id: z.number(),
  expected_delivery_date: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_cost: z.number().positive()
  }))
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;

// Sales Transaction schema
export const salesTransactionSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  user_id: z.number(),
  store_id: z.number(),
  sales_type: salesTypeSchema,
  transaction_date: z.coerce.date(),
  subtotal: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  paid_amount: z.number(),
  status: transactionStatusSchema,
  tracking_number: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SalesTransaction = z.infer<typeof salesTransactionSchema>;

export const createSalesTransactionInputSchema = z.object({
  customer_id: z.number().nullable(),
  store_id: z.number(),
  sales_type: salesTypeSchema,
  discount_amount: z.number().nonnegative(),
  paid_amount: z.number().nonnegative(),
  tracking_number: z.string().nullable(),
  notes: z.string().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    discount_percent: z.number().min(0).max(100)
  }))
});

export type CreateSalesTransactionInput = z.infer<typeof createSalesTransactionInputSchema>;

// Tracking schema
export const trackingSchema = z.object({
  id: z.number(),
  tracking_number: z.string(),
  sales_transaction_id: z.number().nullable(),
  customer_name: z.string(),
  customer_address: z.string(),
  assigned_packer_id: z.number().nullable(),
  status: packingStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tracking = z.infer<typeof trackingSchema>;

export const createTrackingInputSchema = z.object({
  tracking_number: z.string(),
  customer_name: z.string(),
  customer_address: z.string(),
  notes: z.string().nullable()
});

export type CreateTrackingInput = z.infer<typeof createTrackingInputSchema>;

export const updateTrackingStatusInputSchema = z.object({
  tracking_id: z.number(),
  status: packingStatusSchema,
  assigned_packer_id: z.number().nullable(),
  notes: z.string().nullable()
});

export type UpdateTrackingStatusInput = z.infer<typeof updateTrackingStatusInputSchema>;

// Audit Log schema
export const auditLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  activity_type: activityTypeSchema,
  table_name: z.string().nullable(),
  record_id: z.number().nullable(),
  old_data: z.string().nullable(),
  new_data: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const createAuditLogInputSchema = z.object({
  user_id: z.number(),
  activity_type: activityTypeSchema,
  table_name: z.string().nullable(),
  record_id: z.number().nullable(),
  old_data: z.string().nullable(),
  new_data: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable()
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogInputSchema>;

// Commission schema
export const commissionSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  sales_transaction_id: z.number(),
  commission_amount: z.number(),
  commission_rate: z.number(),
  is_paid: z.boolean(),
  paid_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Commission = z.infer<typeof commissionSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginResponseSchema = z.object({
  user: userSchema,
  access_token: z.string(),
  refresh_token: z.string()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Dashboard schemas
export const dashboardStatsSchema = z.object({
  total_sales_today: z.number(),
  total_sales_month: z.number(),
  low_stock_alerts: z.number(),
  active_receivables: z.number(),
  active_payables: z.number(),
  pending_shipments: z.number(),
  unpaid_commissions: z.number(),
  recent_activities: z.array(auditLogSchema)
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;