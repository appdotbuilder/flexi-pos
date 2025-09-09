import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  varchar,
  jsonb
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'SALES']);
export const transactionStatusEnum = pgEnum('transaction_status', ['DRAFT', 'FINAL', 'CANCELLED', 'RETURNED']);
export const packingStatusEnum = pgEnum('packing_status', ['NOT_PROCESSED', 'PROCESSED', 'READY_TO_SHIP', 'SHIPPED']);
export const salesTypeEnum = pgEnum('sales_type', ['RETAIL', 'WHOLESALE', 'ONLINE']);
export const activityTypeEnum = pgEnum('activity_type', ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PURCHASE', 'SALE', 'RETURN', 'TRANSFER', 'PAYMENT']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  store_id: integer('store_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Stores table
export const storesTable = pgTable('stores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Warehouses table
export const warehousesTable = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Product Categories table
export const productCategoriesTable = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Unit Conversions table
export const unitConversionsTable = pgTable('unit_conversions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  base_unit: text('base_unit').notNull(),
  conversion_factor: numeric('conversion_factor', { precision: 10, scale: 4 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  barcode: varchar('barcode', { length: 100 }),
  category_id: integer('category_id').notNull(),
  unit_conversion_id: integer('unit_conversion_id').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  wholesale_price: numeric('wholesale_price', { precision: 10, scale: 2 }).notNull(),
  minimum_stock: integer('minimum_stock').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  credit_limit: numeric('credit_limit', { precision: 10, scale: 2 }).notNull().default('0'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Employees table
export const employeesTable = pgTable('employees', {
  id: serial('id').primaryKey(),
  full_name: text('full_name').notNull(),
  position: text('position').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  commission_rate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  warehouse_id: integer('warehouse_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reserved_quantity: integer('reserved_quantity').notNull().default(0),
  reorder_level: integer('reorder_level').notNull().default(0),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

// Purchase Orders table
export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  supplier_id: integer('supplier_id').notNull(),
  user_id: integer('user_id').notNull(),
  order_date: timestamp('order_date').defaultNow().notNull(),
  expected_delivery_date: timestamp('expected_delivery_date'),
  status: transactionStatusEnum('status').notNull().default('DRAFT'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Purchase Order Items table
export const purchaseOrderItemsTable = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_cost: numeric('unit_cost', { precision: 10, scale: 2 }).notNull(),
  total_cost: numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
});

// Sales Transactions table
export const salesTransactionsTable = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id'),
  user_id: integer('user_id').notNull(),
  store_id: integer('store_id').notNull(),
  sales_type: salesTypeEnum('sales_type').notNull(),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paid_amount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: transactionStatusEnum('status').notNull().default('FINAL'),
  tracking_number: varchar('tracking_number', { length: 100 }),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Sales Transaction Items table
export const salesTransactionItemsTable = pgTable('sales_transaction_items', {
  id: serial('id').primaryKey(),
  sales_transaction_id: integer('sales_transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount_percent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});

// Tracking table
export const trackingTable = pgTable('tracking', {
  id: serial('id').primaryKey(),
  tracking_number: varchar('tracking_number', { length: 100 }).notNull().unique(),
  sales_transaction_id: integer('sales_transaction_id'),
  customer_name: text('customer_name').notNull(),
  customer_address: text('customer_address').notNull(),
  assigned_packer_id: integer('assigned_packer_id'),
  status: packingStatusEnum('status').notNull().default('NOT_PROCESSED'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Audit Log table
export const auditLogTable = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  activity_type: activityTypeEnum('activity_type').notNull(),
  table_name: text('table_name'),
  record_id: integer('record_id'),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Commissions table
export const commissionsTable = pgTable('commissions', {
  id: serial('id').primaryKey(),
  employee_id: integer('employee_id').notNull(),
  sales_transaction_id: integer('sales_transaction_id').notNull(),
  commission_amount: numeric('commission_amount', { precision: 10, scale: 2 }).notNull(),
  commission_rate: numeric('commission_rate', { precision: 5, scale: 2 }).notNull(),
  is_paid: boolean('is_paid').notNull().default(false),
  paid_date: timestamp('paid_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Returns table
export const returnsTable = pgTable('returns', {
  id: serial('id').primaryKey(),
  reference_transaction_id: integer('reference_transaction_id').notNull(),
  user_id: integer('user_id').notNull(),
  return_date: timestamp('return_date').defaultNow().notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  status: transactionStatusEnum('status').notNull().default('FINAL'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Return Items table
export const returnItemsTable = pgTable('return_items', {
  id: serial('id').primaryKey(),
  return_id: integer('return_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});

// Receivables table (Customer payments)
export const receivablesTable = pgTable('receivables', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull(),
  sales_transaction_id: integer('sales_transaction_id').notNull(),
  amount_due: numeric('amount_due', { precision: 10, scale: 2 }).notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  due_date: timestamp('due_date'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, PARTIAL, PAID
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payables table (Supplier payments)
export const payablesTable = pgTable('payables', {
  id: serial('id').primaryKey(),
  supplier_id: integer('supplier_id').notNull(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  amount_due: numeric('amount_due', { precision: 10, scale: 2 }).notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  due_date: timestamp('due_date'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, PARTIAL, PAID
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Goods Receipt table
export const goodsReceiptTable = pgTable('goods_receipt', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  warehouse_id: integer('warehouse_id').notNull(),
  user_id: integer('user_id').notNull(),
  receipt_date: timestamp('receipt_date').defaultNow().notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Goods Receipt Items table
export const goodsReceiptItemsTable = pgTable('goods_receipt_items', {
  id: serial('id').primaryKey(),
  goods_receipt_id: integer('goods_receipt_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity_received: integer('quantity_received').notNull(),
  quantity_ordered: integer('quantity_ordered').notNull(),
});

// Warehouse Transfers table
export const warehouseTransfersTable = pgTable('warehouse_transfers', {
  id: serial('id').primaryKey(),
  from_warehouse_id: integer('from_warehouse_id').notNull(),
  to_warehouse_id: integer('to_warehouse_id').notNull(),
  user_id: integer('user_id').notNull(),
  transfer_date: timestamp('transfer_date').defaultNow().notNull(),
  status: transactionStatusEnum('status').notNull().default('FINAL'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Warehouse Transfer Items table
export const warehouseTransferItemsTable = pgTable('warehouse_transfer_items', {
  id: serial('id').primaryKey(),
  transfer_id: integer('transfer_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
});

// App Settings table
export const appSettingsTable = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  updated_by: integer('updated_by'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  stores: storesTable,
  warehouses: warehousesTable,
  productCategories: productCategoriesTable,
  unitConversions: unitConversionsTable,
  products: productsTable,
  customers: customersTable,
  suppliers: suppliersTable,
  employees: employeesTable,
  inventory: inventoryTable,
  purchaseOrders: purchaseOrdersTable,
  purchaseOrderItems: purchaseOrderItemsTable,
  salesTransactions: salesTransactionsTable,
  salesTransactionItems: salesTransactionItemsTable,
  tracking: trackingTable,
  auditLog: auditLogTable,
  commissions: commissionsTable,
  returns: returnsTable,
  returnItems: returnItemsTable,
  receivables: receivablesTable,
  payables: payablesTable,
  goodsReceipt: goodsReceiptTable,
  goodsReceiptItems: goodsReceiptItemsTable,
  warehouseTransfers: warehouseTransfersTable,
  warehouseTransferItems: warehouseTransferItemsTable,
  appSettings: appSettingsTable
};