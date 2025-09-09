import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createProductInputSchema,
  updateInventoryInputSchema,
  createWarehouseInputSchema,
  createCustomerInputSchema,
  createSalesTransactionInputSchema,
  createPurchaseOrderInputSchema,
  createShippingInputSchema,
  salesReportInputSchema,
  inventoryReportInputSchema
} from './schema';

// Import handlers
import { login, logout } from './handlers/auth';
import { 
  createUser, 
  updateUser, 
  getUsers, 
  getUserById, 
  deactivateUser 
} from './handlers/user_management';
import { 
  createProduct, 
  getProducts, 
  getProductById, 
  updateProduct,
  generateProductBarcode,
  createWarehouse,
  getWarehouses,
  updateInventory,
  getInventoryByWarehouse,
  getLowStockProducts,
  getInventoryReport
} from './handlers/inventory_management';
import { 
  createCustomer, 
  getCustomers, 
  getCustomerById,
  createSalesTransaction,
  getSalesTransactions,
  getSalesTransactionById,
  processSalesReturn,
  printReceipt,
  getSalesReport
} from './handlers/sales_management';
import { 
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  processPurchaseReturn,
  receivePurchaseOrder
} from './handlers/purchase_management';
import { 
  createShipping,
  getShippingByTransaction,
  updateShippingStatus,
  printShippingLabel,
  getShippingsList,
  assignPackingResponsibility,
  updatePackingStatus
} from './handlers/shipping_management';
import { 
  getAccountsReceivable,
  createAccountsReceivable,
  markReceivableAsPaid,
  getOverdueReceivables,
  getAccountsPayable,
  createAccountsPayable,
  markPayableAsPaid,
  getOverduePayables,
  calculateSalesCommissions,
  getSalesCommissions,
  markCommissionAsPaid,
  getUnpaidCommissions
} from './handlers/accounting_management';
import { 
  generateSalesReport,
  generateInventoryReport,
  generateFinancialReport,
  generateCommissionReport,
  generateCustomerReport,
  generateProductReport
} from './handlers/reports';
import { 
  backupDatabase,
  restoreDatabase,
  exportData,
  importData,
  updateSystemSettings,
  getSystemSettings,
  updateBranding,
  getSystemHealth,
  getActivityLogs,
  configureModulePermissions
} from './handlers/system_management';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  logout: publicProcedure
    .mutation(() => logout()),

  // User Management (Super Admin)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),
  
  deactivateUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deactivateUser(input.id)),

  // Product Management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProductById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),
  
  updateProduct: publicProcedure
    .input(z.object({ id: z.number(), updates: createProductInputSchema.partial() }))
    .mutation(({ input }) => updateProduct(input.id, input.updates)),
  
  generateProductBarcode: publicProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(({ input }) => generateProductBarcode(input.productId)),

  // Warehouse Management
  createWarehouse: publicProcedure
    .input(createWarehouseInputSchema)
    .mutation(({ input }) => createWarehouse(input)),
  
  getWarehouses: publicProcedure
    .query(() => getWarehouses()),

  // Inventory Management
  updateInventory: publicProcedure
    .input(updateInventoryInputSchema)
    .mutation(({ input }) => updateInventory(input)),
  
  getInventoryByWarehouse: publicProcedure
    .input(z.object({ warehouseId: z.number() }))
    .query(({ input }) => getInventoryByWarehouse(input.warehouseId)),
  
  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),
  
  getInventoryReport: publicProcedure
    .input(inventoryReportInputSchema)
    .query(({ input }) => getInventoryReport(input)),

  // Customer Management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  getCustomerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),

  // Sales Transaction Management
  createSalesTransaction: publicProcedure
    .input(createSalesTransactionInputSchema)
    .mutation(({ input }) => createSalesTransaction(input)),
  
  getSalesTransactions: publicProcedure
    .query(() => getSalesTransactions()),
  
  getSalesTransactionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSalesTransactionById(input.id)),
  
  processSalesReturn: publicProcedure
    .input(z.object({ transactionId: z.number(), returnReason: z.string() }))
    .mutation(({ input }) => processSalesReturn(input.transactionId, input.returnReason)),
  
  printReceipt: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(({ input }) => printReceipt(input.transactionId)),

  // Purchase Management
  createPurchaseOrder: publicProcedure
    .input(createPurchaseOrderInputSchema)
    .mutation(({ input }) => createPurchaseOrder(input)),
  
  getPurchaseOrders: publicProcedure
    .query(() => getPurchaseOrders()),
  
  getPurchaseOrderById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPurchaseOrderById(input.id)),
  
  updatePurchaseOrderStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(({ input }) => updatePurchaseOrderStatus(input.id, input.status)),
  
  processPurchaseReturn: publicProcedure
    .input(z.object({ purchaseOrderId: z.number(), returnReason: z.string() }))
    .mutation(({ input }) => processPurchaseReturn(input.purchaseOrderId, input.returnReason)),
  
  receivePurchaseOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => receivePurchaseOrder(input.id)),

  // Shipping Management
  createShipping: publicProcedure
    .input(createShippingInputSchema)
    .mutation(({ input }) => createShipping(input)),
  
  getShippingByTransaction: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(({ input }) => getShippingByTransaction(input.transactionId)),
  
  updateShippingStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.string(), trackingNumber: z.string().optional() }))
    .mutation(({ input }) => updateShippingStatus(input.id, input.status, input.trackingNumber)),
  
  printShippingLabel: publicProcedure
    .input(z.object({ shippingId: z.number() }))
    .mutation(({ input }) => printShippingLabel(input.shippingId)),
  
  getShippingsList: publicProcedure
    .query(() => getShippingsList()),
  
  assignPackingResponsibility: publicProcedure
    .input(z.object({ shippingId: z.number(), assignedTo: z.number() }))
    .mutation(({ input }) => assignPackingResponsibility(input.shippingId, input.assignedTo)),
  
  updatePackingStatus: publicProcedure
    .input(z.object({ shippingId: z.number(), packed: z.boolean() }))
    .mutation(({ input }) => updatePackingStatus(input.shippingId, input.packed)),

  // Accounting Management
  getAccountsReceivable: publicProcedure
    .query(() => getAccountsReceivable()),
  
  createAccountsReceivable: publicProcedure
    .input(z.object({ customerId: z.number(), transactionId: z.number(), amount: z.number(), dueDate: z.coerce.date() }))
    .mutation(({ input }) => createAccountsReceivable(input.customerId, input.transactionId, input.amount, input.dueDate)),
  
  markReceivableAsPaid: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => markReceivableAsPaid(input.id)),
  
  getOverdueReceivables: publicProcedure
    .query(() => getOverdueReceivables()),
  
  getAccountsPayable: publicProcedure
    .query(() => getAccountsPayable()),
  
  createAccountsPayable: publicProcedure
    .input(z.object({ purchaseOrderId: z.number(), supplierName: z.string(), amount: z.number(), dueDate: z.coerce.date() }))
    .mutation(({ input }) => createAccountsPayable(input.purchaseOrderId, input.supplierName, input.amount, input.dueDate)),
  
  markPayableAsPaid: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => markPayableAsPaid(input.id)),
  
  getOverduePayables: publicProcedure
    .query(() => getOverduePayables()),
  
  calculateSalesCommissions: publicProcedure
    .input(z.object({ cashierId: z.number(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() }))
    .query(({ input }) => calculateSalesCommissions(input.cashierId, input.periodStart, input.periodEnd)),
  
  getSalesCommissions: publicProcedure
    .query(() => getSalesCommissions()),
  
  markCommissionAsPaid: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => markCommissionAsPaid(input.id)),
  
  getUnpaidCommissions: publicProcedure
    .query(() => getUnpaidCommissions()),

  // Reports
  generateSalesReport: publicProcedure
    .input(salesReportInputSchema)
    .query(({ input }) => generateSalesReport(input)),
  
  generateInventoryReport: publicProcedure
    .input(inventoryReportInputSchema)
    .query(({ input }) => generateInventoryReport(input)),
  
  generateFinancialReport: publicProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(({ input }) => generateFinancialReport(input.startDate, input.endDate)),
  
  generateCommissionReport: publicProcedure
    .input(z.object({ cashierId: z.number().optional() }))
    .query(({ input }) => generateCommissionReport(input.cashierId)),
  
  generateCustomerReport: publicProcedure
    .query(() => generateCustomerReport()),
  
  generateProductReport: publicProcedure
    .query(() => generateProductReport()),

  // System Management (Super Admin only)
  backupDatabase: publicProcedure
    .mutation(() => backupDatabase()),
  
  restoreDatabase: publicProcedure
    .input(z.object({ backupId: z.string() }))
    .mutation(({ input }) => restoreDatabase(input.backupId)),
  
  exportData: publicProcedure
    .input(z.object({ dataType: z.string(), format: z.enum(['CSV', 'JSON', 'EXCEL']) }))
    .mutation(({ input }) => exportData(input.dataType, input.format)),
  
  importData: publicProcedure
    .input(z.object({ dataType: z.string(), fileUrl: z.string() }))
    .mutation(({ input }) => importData(input.dataType, input.fileUrl)),
  
  updateSystemSettings: publicProcedure
    .input(z.record(z.any()))
    .mutation(({ input }) => updateSystemSettings(input)),
  
  getSystemSettings: publicProcedure
    .query(() => getSystemSettings()),
  
  updateBranding: publicProcedure
    .input(z.object({ 
      logo: z.string().optional(), 
      colors: z.record(z.string()).optional(), 
      companyName: z.string().optional() 
    }))
    .mutation(({ input }) => updateBranding(input)),
  
  getSystemHealth: publicProcedure
    .query(() => getSystemHealth()),
  
  getActivityLogs: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getActivityLogs(input.limit)),
  
  configureModulePermissions: publicProcedure
    .input(z.object({ role: z.string(), permissions: z.record(z.boolean()) }))
    .mutation(({ input }) => configureModulePermissions(input.role, input.permissions))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();