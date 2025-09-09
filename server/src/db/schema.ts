import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  pgEnum,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['CASHIER', 'INVENTORY_MANAGER', 'ADMINISTRATOR', 'SUPER_ADMIN']);
export const transactionTypeEnum = pgEnum('transaction_type', ['RETAIL', 'WHOLESALE']);
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'COMPLETED', 'CANCELLED', 'RETURNED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Warehouses table
export const warehousesTable = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  retail_price: numeric('retail_price', { precision: 10, scale: 2 }).notNull(),
  wholesale_price: numeric('wholesale_price', { precision: 10, scale: 2 }).notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  warehouse_id: integer('warehouse_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reserved_quantity: integer('reserved_quantity').notNull().default(0),
  reorder_level: integer('reorder_level').notNull().default(0),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  customer_type: transactionTypeEnum('customer_type').notNull(),
  credit_limit: numeric('credit_limit', { precision: 10, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sales Transactions table
export const salesTransactionsTable = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id'),
  cashier_id: integer('cashier_id').notNull(),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: varchar('payment_method', { length: 50 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sales Transaction Items table
export const salesTransactionItemsTable = pgTable('sales_transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull()
});

// Purchase Orders table
export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  supplier_name: varchar('supplier_name', { length: 255 }).notNull(),
  supplier_email: varchar('supplier_email', { length: 255 }),
  supplier_phone: varchar('supplier_phone', { length: 20 }),
  warehouse_id: integer('warehouse_id').notNull(),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Purchase Order Items table
export const purchaseOrderItemsTable = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_cost: numeric('unit_cost', { precision: 10, scale: 2 }).notNull(),
  total_cost: numeric('total_cost', { precision: 10, scale: 2 }).notNull()
});

// Shipping table
export const shippingTable = pgTable('shipping', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  shipping_address: text('shipping_address').notNull(),
  tracking_number: varchar('tracking_number', { length: 100 }),
  carrier: varchar('carrier', { length: 100 }),
  shipping_cost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull(),
  estimated_delivery: timestamp('estimated_delivery'),
  actual_delivery: timestamp('actual_delivery'),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Accounts Receivable table
export const accountsReceivableTable = pgTable('accounts_receivable', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull(),
  transaction_id: integer('transaction_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  due_date: timestamp('due_date').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Accounts Payable table
export const accountsPayableTable = pgTable('accounts_payable', {
  id: serial('id').primaryKey(),
  purchase_order_id: integer('purchase_order_id').notNull(),
  supplier_name: varchar('supplier_name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  due_date: timestamp('due_date').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sales Commission table
export const salesCommissionTable = pgTable('sales_commission', {
  id: serial('id').primaryKey(),
  cashier_id: integer('cashier_id').notNull(),
  transaction_id: integer('transaction_id').notNull(),
  commission_rate: numeric('commission_rate', { precision: 5, scale: 4 }).notNull(),
  commission_amount: numeric('commission_amount', { precision: 10, scale: 2 }).notNull(),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  is_paid: boolean('is_paid').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  salesTransactions: many(salesTransactionsTable),
  purchaseOrders: many(purchaseOrdersTable),
  salesCommissions: many(salesCommissionTable)
}));

export const warehousesRelations = relations(warehousesTable, ({ many }) => ({
  inventory: many(inventoryTable),
  purchaseOrders: many(purchaseOrdersTable)
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  inventory: many(inventoryTable),
  salesTransactionItems: many(salesTransactionItemsTable),
  purchaseOrderItems: many(purchaseOrderItemsTable)
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryTable.product_id],
    references: [productsTable.id]
  }),
  warehouse: one(warehousesTable, {
    fields: [inventoryTable.warehouse_id],
    references: [warehousesTable.id]
  })
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  salesTransactions: many(salesTransactionsTable),
  accountsReceivable: many(accountsReceivableTable)
}));

export const salesTransactionsRelations = relations(salesTransactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [salesTransactionsTable.customer_id],
    references: [customersTable.id]
  }),
  cashier: one(usersTable, {
    fields: [salesTransactionsTable.cashier_id],
    references: [usersTable.id]
  }),
  items: many(salesTransactionItemsTable),
  shipping: many(shippingTable),
  accountsReceivable: many(accountsReceivableTable),
  salesCommissions: many(salesCommissionTable)
}));

export const salesTransactionItemsRelations = relations(salesTransactionItemsTable, ({ one }) => ({
  transaction: one(salesTransactionsTable, {
    fields: [salesTransactionItemsTable.transaction_id],
    references: [salesTransactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [salesTransactionItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const purchaseOrdersRelations = relations(purchaseOrdersTable, ({ one, many }) => ({
  warehouse: one(warehousesTable, {
    fields: [purchaseOrdersTable.warehouse_id],
    references: [warehousesTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [purchaseOrdersTable.created_by],
    references: [usersTable.id]
  }),
  items: many(purchaseOrderItemsTable),
  accountsPayable: many(accountsPayableTable)
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItemsTable, ({ one }) => ({
  purchaseOrder: one(purchaseOrdersTable, {
    fields: [purchaseOrderItemsTable.purchase_order_id],
    references: [purchaseOrdersTable.id]
  }),
  product: one(productsTable, {
    fields: [purchaseOrderItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const shippingRelations = relations(shippingTable, ({ one }) => ({
  transaction: one(salesTransactionsTable, {
    fields: [shippingTable.transaction_id],
    references: [salesTransactionsTable.id]
  })
}));

export const accountsReceivableRelations = relations(accountsReceivableTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [accountsReceivableTable.customer_id],
    references: [customersTable.id]
  }),
  transaction: one(salesTransactionsTable, {
    fields: [accountsReceivableTable.transaction_id],
    references: [salesTransactionsTable.id]
  })
}));

export const accountsPayableRelations = relations(accountsPayableTable, ({ one }) => ({
  purchaseOrder: one(purchaseOrdersTable, {
    fields: [accountsPayableTable.purchase_order_id],
    references: [purchaseOrdersTable.id]
  })
}));

export const salesCommissionRelations = relations(salesCommissionTable, ({ one }) => ({
  cashier: one(usersTable, {
    fields: [salesCommissionTable.cashier_id],
    references: [usersTable.id]
  }),
  transaction: one(salesTransactionsTable, {
    fields: [salesCommissionTable.transaction_id],
    references: [salesTransactionsTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  warehouses: warehousesTable,
  products: productsTable,
  inventory: inventoryTable,
  customers: customersTable,
  salesTransactions: salesTransactionsTable,
  salesTransactionItems: salesTransactionItemsTable,
  purchaseOrders: purchaseOrdersTable,
  purchaseOrderItems: purchaseOrderItemsTable,
  shipping: shippingTable,
  accountsReceivable: accountsReceivableTable,
  accountsPayable: accountsPayableTable,
  salesCommission: salesCommissionTable
};