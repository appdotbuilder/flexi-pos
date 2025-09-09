import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  salesTransactionsTable, 
  salesTransactionItemsTable,
  usersTable,
  productsTable,
  warehousesTable,
  inventoryTable
} from '../db/schema';
import { 
  type CreateCustomerInput,
  type CreateSalesTransactionInput,
  type SalesReportInput
} from '../schema';
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
} from '../handlers/sales_management';
import { eq } from 'drizzle-orm';

// Test inputs
const testCustomerInput: CreateCustomerInput = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '555-1234',
  address: '123 Test St',
  customer_type: 'RETAIL',
  credit_limit: 1000.00
};

const testWholesaleCustomerInput: CreateCustomerInput = {
  name: 'Wholesale Customer',
  email: 'wholesale@example.com',
  phone: '555-5678',
  address: '456 Business Ave',
  customer_type: 'WHOLESALE',
  credit_limit: 5000.00
};

describe('Customer Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCustomer', () => {
    it('should create a retail customer', async () => {
      const result = await createCustomer(testCustomerInput);

      expect(result.name).toEqual('Test Customer');
      expect(result.email).toEqual('test@example.com');
      expect(result.phone).toEqual('555-1234');
      expect(result.address).toEqual('123 Test St');
      expect(result.customer_type).toEqual('RETAIL');
      expect(result.credit_limit).toEqual(1000.00);
      expect(typeof result.credit_limit).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a wholesale customer', async () => {
      const result = await createCustomer(testWholesaleCustomerInput);

      expect(result.customer_type).toEqual('WHOLESALE');
      expect(result.credit_limit).toEqual(5000.00);
      expect(result.name).toEqual('Wholesale Customer');
    });

    it('should create customer with null credit limit', async () => {
      const input: CreateCustomerInput = {
        ...testCustomerInput,
        credit_limit: null
      };

      const result = await createCustomer(input);

      expect(result.credit_limit).toBeNull();
      expect(result.name).toEqual('Test Customer');
    });

    it('should save customer to database', async () => {
      const result = await createCustomer(testCustomerInput);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, result.id))
        .execute();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toEqual('Test Customer');
      expect(parseFloat(customers[0].credit_limit!)).toEqual(1000.00);
    });
  });

  describe('getCustomers', () => {
    it('should return empty array when no customers exist', async () => {
      const result = await getCustomers();
      expect(result).toEqual([]);
    });

    it('should return all customers', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testWholesaleCustomerInput);

      const result = await getCustomers();

      expect(result).toHaveLength(2);
      expect(result[0].credit_limit).toBe(5000.00); // More recent first (desc order)
      expect(typeof result[0].credit_limit).toBe('number');
      expect(result[1].credit_limit).toBe(1000.00);
      expect(typeof result[1].credit_limit).toBe('number');
    });

    it('should handle customers with null credit limits', async () => {
      const customerWithNullCredit: CreateCustomerInput = {
        ...testCustomerInput,
        credit_limit: null
      };
      await createCustomer(customerWithNullCredit);

      const result = await getCustomers();

      expect(result).toHaveLength(1);
      expect(result[0].credit_limit).toBeNull();
    });
  });

  describe('getCustomerById', () => {
    it('should return null for non-existent customer', async () => {
      const result = await getCustomerById(999);
      expect(result).toBeNull();
    });

    it('should return customer by ID', async () => {
      const created = await createCustomer(testCustomerInput);
      const result = await getCustomerById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Customer');
      expect(result!.credit_limit).toEqual(1000.00);
      expect(typeof result!.credit_limit).toBe('number');
    });
  });
});

describe('Sales Transaction Management', () => {
  let testCustomer: any;
  let testProduct: any;

  beforeEach(async () => {
    await createDB();

    // Create test user (cashier) with ID 1
    const userResult = await db.insert(usersTable).values({
      username: 'testcashier',
      email: 'cashier@example.com',
      password_hash: 'hashed_password',
      role: 'CASHIER',
      first_name: 'Test',
      last_name: 'Cashier'
    }).returning().execute();

    // Create test customer
    testCustomer = await createCustomer(testCustomerInput);

    // Create test warehouse
    const warehouseResult = await db.insert(warehousesTable).values({
      name: 'Test Warehouse',
      address: '123 Warehouse St',
      phone: '555-0000',
      email: 'warehouse@test.com'
    }).returning().execute();

    // Create test product
    const productResult = await db.insert(productsTable).values({
      sku: 'TEST-001',
      name: 'Test Product',
      description: 'A test product',
      retail_price: '19.99',
      wholesale_price: '15.99',
      cost_price: '10.00',
      barcode: '123456789'
    }).returning().execute();

    testProduct = {
      ...productResult[0],
      retail_price: parseFloat(productResult[0].retail_price),
      wholesale_price: parseFloat(productResult[0].wholesale_price),
      cost_price: parseFloat(productResult[0].cost_price)
    };

    // Create inventory
    await db.insert(inventoryTable).values({
      product_id: testProduct.id,
      warehouse_id: warehouseResult[0].id,
      quantity: 100,
      reorder_level: 10
    }).execute();
  });

  afterEach(resetDB);

  describe('createSalesTransaction', () => {
    it('should create a retail sales transaction', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: 'Test transaction',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          unit_price: 19.99,
          total_price: 19.99
        }]
      };

      const result = await createSalesTransaction(transactionInput);

      expect(result.customer_id).toEqual(testCustomer.id);
      expect(result.cashier_id).toEqual(1);
      expect(result.transaction_type).toEqual('RETAIL');
      expect(result.status).toEqual('COMPLETED');
      expect(result.subtotal).toEqual(19.99);
      expect(typeof result.subtotal).toBe('number');
      expect(result.tax_amount).toEqual(1.60);
      expect(result.discount_amount).toEqual(0.00);
      expect(result.total_amount).toEqual(21.59);
      expect(result.payment_method).toEqual('CASH');
      expect(result.notes).toEqual('Test transaction');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create wholesale transaction without customer', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: null,
        transaction_type: 'WHOLESALE',
        subtotal: 159.92,
        tax_amount: 12.79,
        discount_amount: 5.00,
        total_amount: 167.71,
        payment_method: 'CARD',
        notes: null,
        items: [{
          product_id: testProduct.id,
          quantity: 10,
          unit_price: 15.99,
          total_price: 159.90
        }]
      };

      const result = await createSalesTransaction(transactionInput);

      expect(result.customer_id).toBeNull();
      expect(result.transaction_type).toEqual('WHOLESALE');
      expect(result.subtotal).toEqual(159.92);
      expect(result.notes).toBeNull();
    });

    it('should save transaction items to database', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 39.98,
        tax_amount: 3.20,
        discount_amount: 0.00,
        total_amount: 43.18,
        payment_method: 'CASH',
        notes: null,
        items: [{
          product_id: testProduct.id,
          quantity: 2,
          unit_price: 19.99,
          total_price: 39.98
        }]
      };

      const result = await createSalesTransaction(transactionInput);

      const items = await db.select()
        .from(salesTransactionItemsTable)
        .where(eq(salesTransactionItemsTable.transaction_id, result.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].product_id).toEqual(testProduct.id);
      expect(items[0].quantity).toEqual(2);
      expect(parseFloat(items[0].unit_price)).toEqual(19.99);
      expect(parseFloat(items[0].total_price)).toEqual(39.98);
    });

    it('should throw error for non-existent customer', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: 999,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: null,
        items: []
      };

      await expect(createSalesTransaction(transactionInput)).rejects.toThrow(/customer not found/i);
    });
  });

  describe('getSalesTransactions', () => {
    it('should return empty array when no transactions exist', async () => {
      const result = await getSalesTransactions();
      expect(result).toEqual([]);
    });

    it('should return all transactions with numeric conversions', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: 'Test transaction',
        items: []
      };

      await createSalesTransaction(transactionInput);

      const result = await getSalesTransactions();

      expect(result).toHaveLength(1);
      expect(result[0].subtotal).toEqual(19.99);
      expect(typeof result[0].subtotal).toBe('number');
      expect(result[0].total_amount).toEqual(21.59);
      expect(typeof result[0].total_amount).toBe('number');
    });
  });

  describe('getSalesTransactionById', () => {
    it('should return null for non-existent transaction', async () => {
      const result = await getSalesTransactionById(999);
      expect(result).toBeNull();
    });

    it('should return transaction by ID with numeric conversions', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 2.50,
        total_amount: 19.09,
        payment_method: 'CASH',
        notes: 'Test transaction',
        items: []
      };

      const created = await createSalesTransaction(transactionInput);
      const result = await getSalesTransactionById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.subtotal).toEqual(19.99);
      expect(typeof result!.subtotal).toBe('number');
      expect(result!.discount_amount).toEqual(2.50);
      expect(typeof result!.discount_amount).toBe('number');
    });
  });

  describe('processSalesReturn', () => {
    it('should process return for existing transaction', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: 'Original transaction',
        items: []
      };

      const transaction = await createSalesTransaction(transactionInput);
      const result = await processSalesReturn(transaction.id, 'Defective product');

      expect(result.id).toEqual(transaction.id);
      expect(result.status).toEqual('RETURNED');
      expect(result.notes).toEqual('Original transaction; Return: Defective product');
      expect(result.total_amount).toEqual(21.59);
      expect(typeof result.total_amount).toBe('number');
    });

    it('should process return for transaction without existing notes', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: null,
        items: []
      };

      const transaction = await createSalesTransaction(transactionInput);
      const result = await processSalesReturn(transaction.id, 'Customer changed mind');

      expect(result.notes).toEqual('Return: Customer changed mind');
      expect(result.status).toEqual('RETURNED');
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(processSalesReturn(999, 'Test reason')).rejects.toThrow(/transaction not found/i);
    });

    it('should update transaction status in database', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.00,
        total_amount: 21.59,
        payment_method: 'CASH',
        notes: null,
        items: []
      };

      const transaction = await createSalesTransaction(transactionInput);
      await processSalesReturn(transaction.id, 'Test return');

      const updated = await db.select()
        .from(salesTransactionsTable)
        .where(eq(salesTransactionsTable.id, transaction.id))
        .execute();

      expect(updated[0].status).toEqual('RETURNED');
      expect(updated[0].notes).toEqual('Return: Test return');
    });
  });

  describe('printReceipt', () => {
    it('should generate receipt for transaction with items', async () => {
      const transactionInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 19.99,
        tax_amount: 1.60,
        discount_amount: 0.50,
        total_amount: 21.09,
        payment_method: 'CASH',
        notes: 'Test receipt',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          unit_price: 19.99,
          total_price: 19.99
        }]
      };

      const transaction = await createSalesTransaction(transactionInput);
      const result = await printReceipt(transaction.id);

      expect(result.receiptData).toContain('=== RECEIPT ===');
      expect(result.receiptData).toContain(`Transaction ID: ${transaction.id}`);
      expect(result.receiptData).toContain('Payment Method: CASH');
      expect(result.receiptData).toContain('Test Product (TEST-001) x1 @ $19.99 = $19.99');
      expect(result.receiptData).toContain('Subtotal: $19.99');
      expect(result.receiptData).toContain('Tax: $1.60');
      expect(result.receiptData).toContain('Discount: $0.50');
      expect(result.receiptData).toContain('TOTAL: $21.09');
      expect(result.receiptData).toContain('Thank you for your business!');
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(printReceipt(999)).rejects.toThrow(/transaction not found/i);
    });
  });

  describe('getSalesReport', () => {
    it('should generate sales report for date range', async () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      // Create test transactions
      const transactionInput1: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 100.00,
        tax_amount: 8.00,
        discount_amount: 0.00,
        total_amount: 108.00,
        payment_method: 'CASH',
        notes: null,
        items: [{
          product_id: testProduct.id,
          quantity: 5,
          unit_price: 20.00,
          total_price: 100.00
        }]
      };

      const transactionInput2: CreateSalesTransactionInput = {
        customer_id: null,
        transaction_type: 'WHOLESALE',
        subtotal: 200.00,
        tax_amount: 16.00,
        discount_amount: 10.00,
        total_amount: 206.00,
        payment_method: 'CARD',
        notes: null,
        items: [{
          product_id: testProduct.id,
          quantity: 10,
          unit_price: 20.00,
          total_price: 200.00
        }]
      };

      await createSalesTransaction(transactionInput1);
      await createSalesTransaction(transactionInput2);

      const reportInput: SalesReportInput = {
        start_date: startDate,
        end_date: endDate
      };

      const result = await getSalesReport(reportInput);

      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.total_sales).toEqual(314.00); // 108 + 206
      expect(result.total_transactions).toEqual(2);
      expect(result.average_transaction).toEqual(157.00); // 314 / 2
      expect(result.top_products).toHaveLength(1);
      expect(result.top_products[0].product_name).toEqual('Test Product');
      expect(result.top_products[0].total_quantity).toEqual(15);
      expect(result.cashier_performance).toHaveLength(1);
      expect(result.cashier_performance[0].cashier_id).toEqual(1);
      expect(result.cashier_performance[0].total_sales).toEqual(314.00);
    });

    it('should filter by transaction type', async () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      // Create retail and wholesale transactions
      const retailInput: CreateSalesTransactionInput = {
        customer_id: testCustomer.id,
        transaction_type: 'RETAIL',
        subtotal: 50.00,
        tax_amount: 4.00,
        discount_amount: 0.00,
        total_amount: 54.00,
        payment_method: 'CASH',
        notes: null,
        items: []
      };

      const wholesaleInput: CreateSalesTransactionInput = {
        customer_id: null,
        transaction_type: 'WHOLESALE',
        subtotal: 100.00,
        tax_amount: 8.00,
        discount_amount: 0.00,
        total_amount: 108.00,
        payment_method: 'CARD',
        notes: null,
        items: []
      };

      await createSalesTransaction(retailInput);
      await createSalesTransaction(wholesaleInput);

      const reportInput: SalesReportInput = {
        start_date: startDate,
        end_date: endDate,
        transaction_type: 'RETAIL'
      };

      const result = await getSalesReport(reportInput);

      expect(result.total_sales).toEqual(54.00);
      expect(result.total_transactions).toEqual(1);
    });

    it('should return zero values for no transactions in period', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 3);
      
      const startDate = twoDaysAgo;
      const endDate = yesterday;

      const reportInput: SalesReportInput = {
        start_date: startDate,
        end_date: endDate
      };

      const result = await getSalesReport(reportInput);

      expect(result.total_sales).toEqual(0);
      expect(result.total_transactions).toEqual(0);
      expect(result.average_transaction).toEqual(0);
      expect(result.top_products).toHaveLength(0);
      expect(result.cashier_performance).toHaveLength(0);
    });
  });
});