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
  createProductInputSchema,
  createCustomerInputSchema,
  createSupplierInputSchema,
  createEmployeeInputSchema,
  createProductCategoryInputSchema,
  createUnitConversionInputSchema,
  createStoreInputSchema,
  createWarehouseInputSchema,
  updateInventoryInputSchema,
  createPurchaseOrderInputSchema,
  createSalesTransactionInputSchema,
  createTrackingInputSchema,
  updateTrackingStatusInputSchema
} from './schema';

// Import handlers
// Auth handlers
import { loginUser, registerUser, requestPasswordReset, resetPassword, refreshToken, logoutUser } from './handlers/auth';

// Dashboard handlers
import { getDashboardStats, getSalesChartData, getLowStockAlerts, getRecentTransactions } from './handlers/dashboard';

// Master data handlers
import { 
  createProduct, getProducts, updateProduct, deleteProduct,
  createCustomer, getCustomers,
  createSupplier, getSuppliers,
  createEmployee, getEmployees,
  createProductCategory, getProductCategories,
  createUnitConversion, getUnitConversions,
  createStore, getStores,
  createWarehouse, getWarehouses,
  importMasterData, exportMasterData
} from './handlers/master_data';

// Inventory handlers
import { 
  getInventory, getInventoryByWarehouse, getInventoryByProduct, updateInventory,
  receiveGoods, transferInventory, reserveInventory, releaseInventory,
  generateBarcodeLabels, getStockAlerts
} from './handlers/inventory';

// Purchasing handlers
import {
  createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById, updatePurchaseOrder,
  finalizePurchaseOrder, cancelPurchaseOrder, generatePurchaseOrderPDF,
  createPurchaseReturn, getPurchaseReturns, getSupplierPerformance
} from './handlers/purchasing';

// Sales handlers
import {
  createSalesTransaction, getSalesTransactions, getSalesTransactionById,
  processRetailSale, processWholesaleSale, processOnlineSale,
  applyDiscount, processPayment, createSalesReturn, getSalesReturns,
  generateSalesReceipt, getSalesAnalytics
} from './handlers/sales';

// Tracking handlers
import {
  createTracking, getTrackingEntries, getTrackingByStatus, getUnprocessedTracking,
  updateTrackingStatus, assignPacker, bulkUpdateTrackingStatus, getTrackingByNumber,
  generatePackingLabels, generateShippingLabels, getPackerPerformance, getTrackingAuditTrail
} from './handlers/tracking';

// Finance handlers
import {
  getCustomerReceivables, getSupplierPayables, processCustomerPayment, processSupplierPayment,
  getSalesCommissions, getUnpaidCommissions, processCommissionPayment, calculateCommissions,
  getReceivablesAging, getPayablesAging, getFinancialSummary
} from './handlers/finance';

// Reports handlers
import {
  generateSalesReport, generatePurchaseReport, generateSalesAnalysisReport, generateCOGSReport,
  generateCommissionReport, generateReceivablesReport, generatePayablesReport, generateTrackingReport,
  generateInventoryReport, generateProfitLossReport, generateCustomReport
} from './handlers/reports';

// Settings handlers
import {
  getAllUsers, updateUserRole, toggleUserStatus, updateModuleSettings,
  updateAppInfo, getAppInfo, createBackup, restoreBackup,
  generateDummyData, clearAllData, downloadExcelTemplate,
  previewExcelImport, confirmExcelImport, getSystemSettings
} from './handlers/settings';

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

  // Auth routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => loginUser(input)),
    register: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => registerUser(input)),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(({ input }) => requestPasswordReset(input.email)),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string() }))
      .mutation(({ input }) => resetPassword(input.token, input.newPassword)),
    refreshToken: publicProcedure
      .input(z.object({ refreshToken: z.string() }))
      .mutation(({ input }) => refreshToken(input.refreshToken)),
    logout: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => logoutUser(input.userId)),
  }),

  // Dashboard routes
  dashboard: router({
    getStats: publicProcedure.query(() => getDashboardStats()),
    getSalesChart: publicProcedure
      .input(z.object({ period: z.enum(['week', 'month']) }))
      .query(({ input }) => getSalesChartData(input.period)),
    getLowStockAlerts: publicProcedure.query(() => getLowStockAlerts()),
    getRecentTransactions: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => getRecentTransactions(input.limit)),
  }),

  // Master data routes
  masterData: router({
    // Products
    products: router({
      create: publicProcedure
        .input(createProductInputSchema)
        .mutation(({ input }) => createProduct(input)),
      getAll: publicProcedure.query(() => getProducts()),
      update: publicProcedure
        .input(z.object({ id: z.number(), data: createProductInputSchema.partial() }))
        .mutation(({ input }) => updateProduct(input.id, input.data)),
      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteProduct(input.id)),
    }),
    
    // Customers
    customers: router({
      create: publicProcedure
        .input(createCustomerInputSchema)
        .mutation(({ input }) => createCustomer(input)),
      getAll: publicProcedure.query(() => getCustomers()),
    }),
    
    // Suppliers
    suppliers: router({
      create: publicProcedure
        .input(createSupplierInputSchema)
        .mutation(({ input }) => createSupplier(input)),
      getAll: publicProcedure.query(() => getSuppliers()),
    }),
    
    // Employees
    employees: router({
      create: publicProcedure
        .input(createEmployeeInputSchema)
        .mutation(({ input }) => createEmployee(input)),
      getAll: publicProcedure.query(() => getEmployees()),
    }),
    
    // Product Categories
    categories: router({
      create: publicProcedure
        .input(createProductCategoryInputSchema)
        .mutation(({ input }) => createProductCategory(input)),
      getAll: publicProcedure.query(() => getProductCategories()),
    }),
    
    // Unit Conversions
    units: router({
      create: publicProcedure
        .input(createUnitConversionInputSchema)
        .mutation(({ input }) => createUnitConversion(input)),
      getAll: publicProcedure.query(() => getUnitConversions()),
    }),
    
    // Stores
    stores: router({
      create: publicProcedure
        .input(createStoreInputSchema)
        .mutation(({ input }) => createStore(input)),
      getAll: publicProcedure.query(() => getStores()),
    }),
    
    // Warehouses
    warehouses: router({
      create: publicProcedure
        .input(createWarehouseInputSchema)
        .mutation(({ input }) => createWarehouse(input)),
      getAll: publicProcedure.query(() => getWarehouses()),
    }),
    
    // Import/Export
    import: publicProcedure
      .input(z.object({ type: z.string(), data: z.array(z.any()) }))
      .mutation(({ input }) => importMasterData(input.type, input.data)),
    export: publicProcedure
      .input(z.object({ type: z.string() }))
      .query(({ input }) => exportMasterData(input.type)),
  }),

  // Inventory routes
  inventory: router({
    getAll: publicProcedure.query(() => getInventory()),
    getByWarehouse: publicProcedure
      .input(z.object({ warehouseId: z.number() }))
      .query(({ input }) => getInventoryByWarehouse(input.warehouseId)),
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => getInventoryByProduct(input.productId)),
    update: publicProcedure
      .input(updateInventoryInputSchema)
      .mutation(({ input }) => updateInventory(input)),
    receiveGoods: publicProcedure
      .input(z.object({ 
        purchaseOrderId: z.number(), 
        warehouseId: z.number(), 
        items: z.array(z.object({ product_id: z.number(), quantity_received: z.number() }))
      }))
      .mutation(({ input }) => receiveGoods(input.purchaseOrderId, input.warehouseId, input.items)),
    transfer: publicProcedure
      .input(z.object({
        fromWarehouseId: z.number(),
        toWarehouseId: z.number(),
        items: z.array(z.object({ product_id: z.number(), quantity: z.number() }))
      }))
      .mutation(({ input }) => transferInventory(input.fromWarehouseId, input.toWarehouseId, input.items)),
    generateBarcodes: publicProcedure
      .input(z.object({ productId: z.number(), warehouseId: z.number(), quantity: z.number() }))
      .mutation(({ input }) => generateBarcodeLabels(input.productId, input.warehouseId, input.quantity)),
    getStockAlerts: publicProcedure.query(() => getStockAlerts()),
  }),

  // Purchasing routes
  purchasing: router({
    orders: router({
      create: publicProcedure
        .input(createPurchaseOrderInputSchema)
        .mutation(({ input }) => createPurchaseOrder(input)),
      getAll: publicProcedure.query(() => getPurchaseOrders()),
      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => getPurchaseOrderById(input.id)),
      finalize: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => finalizePurchaseOrder(input.id)),
      cancel: publicProcedure
        .input(z.object({ id: z.number(), reason: z.string() }))
        .mutation(({ input }) => cancelPurchaseOrder(input.id, input.reason)),
      generatePDF: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => generatePurchaseOrderPDF(input.id)),
    }),
    returns: router({
      create: publicProcedure
        .input(z.object({
          purchaseOrderId: z.number(),
          items: z.array(z.object({ product_id: z.number(), quantity: z.number(), reason: z.string() }))
        }))
        .mutation(({ input }) => createPurchaseReturn(input.purchaseOrderId, input.items)),
      getAll: publicProcedure.query(() => getPurchaseReturns()),
    }),
  }),

  // Sales routes
  sales: router({
    transactions: router({
      create: publicProcedure
        .input(createSalesTransactionInputSchema)
        .mutation(({ input }) => createSalesTransaction(input)),
      getAll: publicProcedure.query(() => getSalesTransactions()),
      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => getSalesTransactionById(input.id)),
      processRetail: publicProcedure
        .input(z.object({
          items: z.array(z.object({ product_id: z.number(), quantity: z.number(), discount_percent: z.number().optional() })),
          storeId: z.number(),
          paymentAmount: z.number()
        }))
        .mutation(({ input }) => processRetailSale(input.items, input.storeId, input.paymentAmount)),
      processWholesale: publicProcedure
        .input(createSalesTransactionInputSchema.extend({ salesPersonId: z.number() }))
        .mutation(({ input }) => processWholesaleSale(input, input.salesPersonId)),
      processOnline: publicProcedure
        .input(createSalesTransactionInputSchema)
        .mutation(({ input }) => processOnlineSale(input)),
      generateReceipt: publicProcedure
        .input(z.object({ transactionId: z.number() }))
        .query(({ input }) => generateSalesReceipt(input.transactionId)),
    }),
    returns: router({
      create: publicProcedure
        .input(z.object({
          transactionId: z.number(),
          items: z.array(z.object({ product_id: z.number(), quantity: z.number(), reason: z.string() }))
        }))
        .mutation(({ input }) => createSalesReturn(input.transactionId, input.items)),
      getAll: publicProcedure.query(() => getSalesReturns()),
    }),
    analytics: publicProcedure
      .input(z.object({
        storeId: z.number().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional()
      }))
      .query(({ input }) => getSalesAnalytics(input.storeId, input.startDate, input.endDate)),
  }),

  // Tracking routes
  tracking: router({
    create: publicProcedure
      .input(createTrackingInputSchema)
      .mutation(({ input }) => createTracking(input)),
    getAll: publicProcedure.query(() => getTrackingEntries()),
    getByStatus: publicProcedure
      .input(z.object({ status: z.enum(['NOT_PROCESSED', 'PROCESSED', 'READY_TO_SHIP', 'SHIPPED']) }))
      .query(({ input }) => getTrackingByStatus(input.status)),
    getUnprocessed: publicProcedure.query(() => getUnprocessedTracking()),
    updateStatus: publicProcedure
      .input(updateTrackingStatusInputSchema)
      .mutation(({ input }) => updateTrackingStatus(input)),
    assignPacker: publicProcedure
      .input(z.object({ trackingId: z.number(), packerId: z.number() }))
      .mutation(({ input }) => assignPacker(input.trackingId, input.packerId)),
    bulkUpdateStatus: publicProcedure
      .input(z.object({
        trackingNumbers: z.array(z.string()),
        newStatus: z.enum(['PROCESSED', 'READY_TO_SHIP', 'SHIPPED']),
        packerId: z.number().optional()
      }))
      .mutation(({ input }) => bulkUpdateTrackingStatus(input.trackingNumbers, input.newStatus, input.packerId)),
    generatePackingLabels: publicProcedure
      .input(z.object({ trackingIds: z.array(z.number()) }))
      .query(({ input }) => generatePackingLabels(input.trackingIds)),
    generateShippingLabels: publicProcedure
      .input(z.object({ trackingIds: z.array(z.number()) }))
      .query(({ input }) => generateShippingLabels(input.trackingIds)),
  }),

  // Finance routes
  finance: router({
    receivables: router({
      getAll: publicProcedure.query(() => getCustomerReceivables()),
      processPayment: publicProcedure
        .input(z.object({
          customerId: z.number(),
          amount: z.number(),
          paymentMethod: z.string(),
          transactionIds: z.array(z.number()).optional()
        }))
        .mutation(({ input }) => processCustomerPayment(input.customerId, input.amount, input.paymentMethod, input.transactionIds)),
      getAging: publicProcedure.query(() => getReceivablesAging()),
    }),
    payables: router({
      getAll: publicProcedure.query(() => getSupplierPayables()),
      processPayment: publicProcedure
        .input(z.object({
          supplierId: z.number(),
          amount: z.number(),
          paymentMethod: z.string(),
          purchaseOrderIds: z.array(z.number()).optional()
        }))
        .mutation(({ input }) => processSupplierPayment(input.supplierId, input.amount, input.paymentMethod, input.purchaseOrderIds)),
      getAging: publicProcedure.query(() => getPayablesAging()),
    }),
    commissions: router({
      getAll: publicProcedure.query(() => getSalesCommissions()),
      getUnpaid: publicProcedure.query(() => getUnpaidCommissions()),
      processPayment: publicProcedure
        .input(z.object({
          commissionIds: z.array(z.number()),
          paymentMethod: z.string()
        }))
        .mutation(({ input }) => processCommissionPayment(input.commissionIds, input.paymentMethod)),
      calculate: publicProcedure
        .input(z.object({
          employeeId: z.number(),
          startDate: z.coerce.date(),
          endDate: z.coerce.date()
        }))
        .query(({ input }) => calculateCommissions(input.employeeId, input.startDate, input.endDate)),
    }),
    summary: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date()
      }))
      .query(({ input }) => getFinancialSummary(input.startDate, input.endDate)),
  }),

  // Reports routes
  reports: router({
    sales: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        storeId: z.number().optional(),
        categoryId: z.number().optional()
      }))
      .query(({ input }) => generateSalesReport(input.startDate, input.endDate, input.storeId, input.categoryId)),
    purchases: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        supplierId: z.number().optional(),
        categoryId: z.number().optional()
      }))
      .query(({ input }) => generatePurchaseReport(input.startDate, input.endDate, input.supplierId, input.categoryId)),
    salesAnalysis: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        groupBy: z.enum(['product', 'category', 'store', 'user'])
      }))
      .query(({ input }) => generateSalesAnalysisReport(input.startDate, input.endDate, input.groupBy)),
    cogs: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        productId: z.number().optional(),
        categoryId: z.number().optional()
      }))
      .query(({ input }) => generateCOGSReport(input.startDate, input.endDate, input.productId, input.categoryId)),
    commissions: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        employeeId: z.number().optional()
      }))
      .query(({ input }) => generateCommissionReport(input.startDate, input.endDate, input.employeeId)),
    tracking: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        status: z.string().optional(),
        storeId: z.number().optional()
      }))
      .query(({ input }) => generateTrackingReport(input.startDate, input.endDate, input.status, input.storeId)),
    inventory: publicProcedure
      .input(z.object({
        warehouseId: z.number().optional(),
        categoryId: z.number().optional(),
        lowStockOnly: z.boolean().optional()
      }))
      .query(({ input }) => generateInventoryReport(input.warehouseId, input.categoryId, input.lowStockOnly)),
    profitLoss: publicProcedure
      .input(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        storeId: z.number().optional()
      }))
      .query(({ input }) => generateProfitLossReport(input.startDate, input.endDate, input.storeId)),
  }),

  // Settings routes (Super Admin only)
  settings: router({
    users: router({
      getAll: publicProcedure.query(() => getAllUsers()),
      updateRole: publicProcedure
        .input(z.object({
          userId: z.number(),
          newRole: z.enum(['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'SALES']),
          storeId: z.number().optional()
        }))
        .mutation(({ input }) => updateUserRole(input.userId, input.newRole, input.storeId)),
      toggleStatus: publicProcedure
        .input(z.object({
          userId: z.number(),
          isActive: z.boolean()
        }))
        .mutation(({ input }) => toggleUserStatus(input.userId, input.isActive)),
    }),
    modules: publicProcedure
      .input(z.object({
        modules: z.array(z.object({ name: z.string(), enabled: z.boolean() }))
      }))
      .mutation(({ input }) => updateModuleSettings(input.modules)),
    appInfo: router({
      get: publicProcedure.query(() => getAppInfo()),
      update: publicProcedure
        .input(z.object({
          company_name: z.string(),
          address: z.string(),
          phone: z.string(),
          email: z.string(),
          logo_url: z.string().optional()
        }))
        .mutation(({ input }) => updateAppInfo(input)),
    }),
    backup: router({
      create: publicProcedure.mutation(() => createBackup()),
      restore: publicProcedure
        .input(z.object({ backupFile: z.string() }))
        .mutation(({ input }) => restoreBackup(input.backupFile)),
    }),
    data: router({
      generateDummy: publicProcedure
        .input(z.object({
          dataTypes: z.array(z.string()),
          recordCounts: z.record(z.number())
        }))
        .mutation(({ input }) => generateDummyData(input.dataTypes, input.recordCounts)),
      clearAll: publicProcedure
        .input(z.object({ confirmation: z.string() }))
        .mutation(({ input }) => clearAllData(input.confirmation)),
    }),
    excel: router({
      downloadTemplate: publicProcedure
        .input(z.object({ dataType: z.string() }))
        .query(({ input }) => downloadExcelTemplate(input.dataType)),
      previewImport: publicProcedure
        .input(z.object({
          dataType: z.string(),
          file: z.any() // Buffer type
        }))
        .mutation(({ input }) => previewExcelImport(input.dataType, input.file)),
      confirmImport: publicProcedure
        .input(z.object({
          dataType: z.string(),
          file: z.any(), // Buffer type
          skipErrors: z.boolean().default(false)
        }))
        .mutation(({ input }) => confirmExcelImport(input.dataType, input.file, input.skipErrors)),
    }),
    getSystemSettings: publicProcedure.query(() => getSystemSettings()),
  }),
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
  console.log(`TRPC POS server listening at port: ${port}`);
}

start();