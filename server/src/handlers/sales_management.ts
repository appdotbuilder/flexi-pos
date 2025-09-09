import { db } from '../db';
import { 
  customersTable, 
  salesTransactionsTable, 
  salesTransactionItemsTable, 
  usersTable, 
  productsTable, 
  inventoryTable 
} from '../db/schema';
import { 
  type SalesTransaction, 
  type CreateSalesTransactionInput,
  type Customer,
  type CreateCustomerInput,
  type SalesReportInput
} from '../schema';
import { eq, and, gte, lte, desc, sum, count, sql, SQL } from 'drizzle-orm';

// Customer management
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        customer_type: input.customer_type,
        credit_limit: input.credit_limit ? input.credit_limit.toString() : null
      })
      .returning()
      .execute();

    const customer = result[0];
    return {
      ...customer,
      credit_limit: customer.credit_limit ? parseFloat(customer.credit_limit) : null
    };
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const results = await db.select()
      .from(customersTable)
      .orderBy(desc(customersTable.created_at))
      .execute();

    return results.map(customer => ({
      ...customer,
      credit_limit: customer.credit_limit ? parseFloat(customer.credit_limit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const customer = results[0];
    return {
      ...customer,
      credit_limit: customer.credit_limit ? parseFloat(customer.credit_limit) : null
    };
  } catch (error) {
    console.error('Failed to fetch customer by ID:', error);
    throw error;
  }
}

// Sales transaction management
export async function createSalesTransaction(input: CreateSalesTransactionInput): Promise<SalesTransaction> {
  try {
    // Validate customer exists if provided
    if (input.customer_id) {
      const customerExists = await db.select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();
      
      if (customerExists.length === 0) {
        throw new Error('Customer not found');
      }
    }

    // For this example, we'll use a default cashier_id of 1
    // In a real implementation, this would come from the authenticated user context
    const cashierId = 1;
    
    // Validate cashier exists
    const cashierExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, cashierId))
      .execute();
    
    if (cashierExists.length === 0) {
      throw new Error('Cashier not found');
    }

    // Create the transaction
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        customer_id: input.customer_id,
        cashier_id: cashierId,
        transaction_type: input.transaction_type,
        status: 'COMPLETED',
        subtotal: input.subtotal.toString(),
        tax_amount: input.tax_amount.toString(),
        discount_amount: input.discount_amount.toString(),
        total_amount: input.total_amount.toString(),
        payment_method: input.payment_method,
        notes: input.notes
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items
    if (input.items && input.items.length > 0) {
      await db.insert(salesTransactionItemsTable)
        .values(input.items.map(item => ({
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: item.total_price.toString()
        })))
        .execute();
    }

    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Sales transaction creation failed:', error);
    throw error;
  }
}

export async function getSalesTransactions(): Promise<SalesTransaction[]> {
  try {
    const results = await db.select()
      .from(salesTransactionsTable)
      .orderBy(desc(salesTransactionsTable.created_at))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch sales transactions:', error);
    throw error;
  }
}

export async function getSalesTransactionById(id: number): Promise<SalesTransaction | null> {
  try {
    const results = await db.select()
      .from(salesTransactionsTable)
      .where(eq(salesTransactionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const transaction = results[0];
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Failed to fetch sales transaction by ID:', error);
    throw error;
  }
}

export async function processSalesReturn(transactionId: number, returnReason: string): Promise<SalesTransaction> {
  try {
    // Check if transaction exists
    const existingTransaction = await getSalesTransactionById(transactionId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    // Update transaction status to RETURNED
    const result = await db.update(salesTransactionsTable)
      .set({
        status: 'RETURNED',
        notes: existingTransaction.notes 
          ? `${existingTransaction.notes}; Return: ${returnReason}` 
          : `Return: ${returnReason}`
      })
      .where(eq(salesTransactionsTable.id, transactionId))
      .returning()
      .execute();

    const transaction = result[0];
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      tax_amount: parseFloat(transaction.tax_amount),
      discount_amount: parseFloat(transaction.discount_amount),
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Sales return processing failed:', error);
    throw error;
  }
}

export async function printReceipt(transactionId: number): Promise<{ receiptData: string }> {
  try {
    // Get transaction details with items
    const transaction = await getSalesTransactionById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get transaction items with product details
    const itemsResults = await db.select({
      quantity: salesTransactionItemsTable.quantity,
      unit_price: salesTransactionItemsTable.unit_price,
      total_price: salesTransactionItemsTable.total_price,
      product_name: productsTable.name,
      product_sku: productsTable.sku
    })
    .from(salesTransactionItemsTable)
    .innerJoin(productsTable, eq(salesTransactionItemsTable.product_id, productsTable.id))
    .where(eq(salesTransactionItemsTable.transaction_id, transactionId))
    .execute();

    // Format receipt data
    const receiptLines = [
      '=== RECEIPT ===',
      `Transaction ID: ${transactionId}`,
      `Date: ${transaction.created_at.toISOString()}`,
      `Payment Method: ${transaction.payment_method}`,
      '',
      'ITEMS:',
      ...itemsResults.map(item => 
        `${item.product_name} (${item.product_sku}) x${item.quantity} @ $${parseFloat(item.unit_price).toFixed(2)} = $${parseFloat(item.total_price).toFixed(2)}`
      ),
      '',
      `Subtotal: $${transaction.subtotal.toFixed(2)}`,
      `Tax: $${transaction.tax_amount.toFixed(2)}`,
      `Discount: $${transaction.discount_amount.toFixed(2)}`,
      `TOTAL: $${transaction.total_amount.toFixed(2)}`,
      '',
      'Thank you for your business!'
    ];

    return { receiptData: receiptLines.join('\n') };
  } catch (error) {
    console.error('Receipt generation failed:', error);
    throw error;
  }
}

export async function getSalesReport(input: SalesReportInput): Promise<any> {
  try {
    // Build conditions array for main query
    const conditions: SQL<unknown>[] = [];
    
    conditions.push(gte(salesTransactionsTable.created_at, input.start_date));
    conditions.push(lte(salesTransactionsTable.created_at, input.end_date));
    conditions.push(eq(salesTransactionsTable.status, 'COMPLETED'));

    if (input.cashier_id !== undefined) {
      conditions.push(eq(salesTransactionsTable.cashier_id, input.cashier_id));
    }

    if (input.transaction_type) {
      conditions.push(eq(salesTransactionsTable.transaction_type, input.transaction_type));
    }

    // Get cashier performance data
    const cashierQuery = db.select({
      total_sales: sum(salesTransactionsTable.total_amount).as('total_sales'),
      total_transactions: count(salesTransactionsTable.id).as('total_transactions'),
      cashier_id: salesTransactionsTable.cashier_id
    })
    .from(salesTransactionsTable)
    .where(and(...conditions));

    const results = input.cashier_id === undefined 
      ? await cashierQuery.groupBy(salesTransactionsTable.cashier_id).execute()
      : await cashierQuery.execute();

    // Calculate totals
    const totalSales = results.reduce((sum, row) => sum + (row.total_sales ? parseFloat(row.total_sales.toString()) : 0), 0);
    const totalTransactions = results.reduce((sum, row) => sum + Number(row.total_transactions), 0);
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Get top products for the period
    const topProductsConditions: SQL<unknown>[] = [];
    topProductsConditions.push(gte(salesTransactionsTable.created_at, input.start_date));
    topProductsConditions.push(lte(salesTransactionsTable.created_at, input.end_date));
    topProductsConditions.push(eq(salesTransactionsTable.status, 'COMPLETED'));

    if (input.transaction_type) {
      topProductsConditions.push(eq(salesTransactionsTable.transaction_type, input.transaction_type));
    }

    const topProducts = await db.select({
      product_name: productsTable.name,
      product_sku: productsTable.sku,
      total_quantity: sum(salesTransactionItemsTable.quantity).as('total_quantity'),
      total_revenue: sum(salesTransactionItemsTable.total_price).as('total_revenue')
    })
    .from(salesTransactionItemsTable)
    .innerJoin(salesTransactionsTable, eq(salesTransactionItemsTable.transaction_id, salesTransactionsTable.id))
    .innerJoin(productsTable, eq(salesTransactionItemsTable.product_id, productsTable.id))
    .where(and(...topProductsConditions))
    .groupBy(productsTable.id, productsTable.name, productsTable.sku)
    .orderBy(desc(sum(salesTransactionItemsTable.quantity)))
    .limit(10)
    .execute();

    return {
      period: {
        start_date: input.start_date,
        end_date: input.end_date
      },
      total_sales: totalSales,
      total_transactions: totalTransactions,
      average_transaction: averageTransaction,
      top_products: topProducts.map(product => ({
        ...product,
        total_quantity: product.total_quantity ? Number(product.total_quantity) : 0,
        total_revenue: product.total_revenue ? parseFloat(product.total_revenue.toString()) : 0
      })),
      cashier_performance: results.map(row => ({
        cashier_id: row.cashier_id,
        total_sales: row.total_sales ? parseFloat(row.total_sales.toString()) : 0,
        total_transactions: Number(row.total_transactions)
      }))
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}