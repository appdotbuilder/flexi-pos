import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsReceivableTable, customersTable, salesTransactionsTable, usersTable } from '../db/schema';
import { getOverdueReceivables } from '../handlers/accounting_management';

describe('getOverdueReceivables', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only overdue pending receivables', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'Cashier'
      })
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '1234567890',
        address: '123 Test St',
        customer_type: 'RETAIL',
        credit_limit: '1000.00'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(salesTransactionsTable)
      .values({
        customer_id: customer.id,
        cashier_id: user.id,
        transaction_type: 'RETAIL',
        status: 'COMPLETED',
        subtotal: '100.00',
        tax_amount: '10.00',
        discount_amount: '0.00',
        total_amount: '110.00',
        payment_method: 'credit'
      })
      .returning()
      .execute();

    // Create test receivables
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Overdue pending receivable (should be included)
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '150.00',
        due_date: yesterday,
        status: 'PENDING',
        notes: 'Overdue payment'
      })
      .execute();

    // Very overdue pending receivable (should be included)
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '200.00',
        due_date: lastWeek,
        status: 'PENDING',
        notes: 'Very overdue payment'
      })
      .execute();

    // Not yet due pending receivable (should NOT be included)
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '300.00',
        due_date: tomorrow,
        status: 'PENDING',
        notes: 'Future payment'
      })
      .execute();

    // Overdue but paid receivable (should NOT be included)
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '75.00',
        due_date: yesterday,
        status: 'PAID',
        notes: 'Already paid'
      })
      .execute();

    // Overdue cancelled receivable (should NOT be included)
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '100.00',
        due_date: yesterday,
        status: 'CANCELLED',
        notes: 'Cancelled payment'
      })
      .execute();

    const result = await getOverdueReceivables();

    // Should only return the 2 overdue pending receivables
    expect(result).toHaveLength(2);
    
    // Verify all results are overdue and pending
    result.forEach(receivable => {
      expect(receivable.status).toEqual('PENDING');
      expect(receivable.due_date < today).toBe(true);
      expect(typeof receivable.amount).toEqual('number');
    });

    // Check specific amounts
    const amounts = result.map(r => r.amount).sort();
    expect(amounts).toEqual([150, 200]);
  });

  it('should return empty array when no overdue receivables exist', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'Cashier'
      })
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        email: 'customer@test.com',
        customer_type: 'RETAIL'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(salesTransactionsTable)
      .values({
        customer_id: customer.id,
        cashier_id: user.id,
        transaction_type: 'RETAIL',
        subtotal: '100.00',
        tax_amount: '10.00',
        total_amount: '110.00',
        payment_method: 'cash'
      })
      .returning()
      .execute();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create only future due receivables
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '100.00',
        due_date: tomorrow,
        status: 'PENDING'
      })
      .execute();

    const result = await getOverdueReceivables();

    expect(result).toHaveLength(0);
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'Cashier'
      })
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        customer_type: 'RETAIL'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(salesTransactionsTable)
      .values({
        customer_id: customer.id,
        cashier_id: user.id,
        transaction_type: 'RETAIL',
        subtotal: '100.00',
        total_amount: '100.00',
        payment_method: 'credit'
      })
      .returning()
      .execute();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create overdue receivable with decimal amount
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '123.45',
        due_date: yesterday,
        status: 'PENDING'
      })
      .execute();

    const result = await getOverdueReceivables();

    expect(result).toHaveLength(1);
    expect(typeof result[0].amount).toEqual('number');
    expect(result[0].amount).toEqual(123.45);
  });

  it('should validate all required fields are present', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'Cashier'
      })
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        customer_type: 'RETAIL'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(salesTransactionsTable)
      .values({
        customer_id: customer.id,
        cashier_id: user.id,
        transaction_type: 'RETAIL',
        subtotal: '100.00',
        total_amount: '100.00',
        payment_method: 'credit'
      })
      .returning()
      .execute();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '500.00',
        due_date: yesterday,
        status: 'PENDING',
        notes: 'Test overdue payment'
      })
      .execute();

    const result = await getOverdueReceivables();

    expect(result).toHaveLength(1);
    
    const receivable = result[0];
    expect(receivable.id).toBeDefined();
    expect(receivable.customer_id).toEqual(customer.id);
    expect(receivable.transaction_id).toEqual(transaction.id);
    expect(receivable.amount).toEqual(500);
    expect(receivable.due_date).toBeInstanceOf(Date);
    expect(receivable.status).toEqual('PENDING');
    expect(receivable.notes).toEqual('Test overdue payment');
    expect(receivable.created_at).toBeInstanceOf(Date);
  });

  it('should exclude non-pending statuses from overdue results', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'Cashier'
      })
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        customer_type: 'RETAIL'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(salesTransactionsTable)
      .values({
        customer_id: customer.id,
        cashier_id: user.id,
        transaction_type: 'RETAIL',
        subtotal: '100.00',
        total_amount: '100.00',
        payment_method: 'credit'
      })
      .returning()
      .execute();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create overdue receivables with different statuses
    await db.insert(accountsReceivableTable)
      .values({
        customer_id: customer.id,
        transaction_id: transaction.id,
        amount: '100.00',
        due_date: yesterday,
        status: 'OVERDUE' // This should NOT be included - only PENDING
      })
      .execute();

    const result = await getOverdueReceivables();

    // Should not include OVERDUE status - only PENDING
    expect(result).toHaveLength(0);
  });
});