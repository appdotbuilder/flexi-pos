import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    shippingTable, 
    salesTransactionsTable, 
    usersTable, 
    customersTable 
} from '../db/schema';
import { 
    type CreateShippingInput,
    type CreateUserInput,
    type CreateCustomerInput
} from '../schema';
import { 
    createShipping,
    getShippingByTransaction,
    updateShippingStatus,
    printShippingLabel,
    getShippingsList,
    assignPackingResponsibility,
    updatePackingStatus
} from '../handlers/shipping_management';
import { eq } from 'drizzle-orm';

describe('shipping_management', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testUserId: number;
    let testCustomerId: number;
    let testTransactionId: number;

    const createTestUser = async (): Promise<number> => {
        const result = await db.insert(usersTable)
            .values({
                username: 'testcashier',
                email: 'cashier@test.com',
                password_hash: 'hashed_password',
                role: 'CASHIER',
                first_name: 'Test',
                last_name: 'Cashier'
            })
            .returning()
            .execute();
        return result[0].id;
    };

    const createTestCustomer = async (): Promise<number> => {
        const result = await db.insert(customersTable)
            .values({
                name: 'Test Customer',
                email: 'customer@test.com',
                phone: '123-456-7890',
                address: '123 Main St',
                customer_type: 'RETAIL',
                credit_limit: null
            })
            .returning()
            .execute();
        return result[0].id;
    };

    const createTestTransaction = async (cashierId: number, customerId: number): Promise<number> => {
        const result = await db.insert(salesTransactionsTable)
            .values({
                customer_id: customerId,
                cashier_id: cashierId,
                transaction_type: 'RETAIL',
                status: 'COMPLETED',
                subtotal: '100.00',
                tax_amount: '8.00',
                discount_amount: '0.00',
                total_amount: '108.00',
                payment_method: 'CASH'
            })
            .returning()
            .execute();
        return result[0].id;
    };

    beforeEach(async () => {
        testUserId = await createTestUser();
        testCustomerId = await createTestCustomer();
        testTransactionId = await createTestTransaction(testUserId, testCustomerId);
    });

    describe('createShipping', () => {
        const testShippingInput: CreateShippingInput = {
            transaction_id: 0, // Will be set to testTransactionId
            shipping_address: '456 Oak Ave, Springfield, IL 62701',
            tracking_number: 'TRK123456789',
            carrier: 'UPS',
            shipping_cost: 15.99,
            estimated_delivery: new Date('2024-01-15')
        };

        it('should create a shipping record', async () => {
            const input = { ...testShippingInput, transaction_id: testTransactionId };
            const result = await createShipping(input);

            expect(result.transaction_id).toEqual(testTransactionId);
            expect(result.shipping_address).toEqual('456 Oak Ave, Springfield, IL 62701');
            expect(result.tracking_number).toEqual('TRK123456789');
            expect(result.carrier).toEqual('UPS');
            expect(result.shipping_cost).toEqual(15.99);
            expect(result.estimated_delivery).toEqual(input.estimated_delivery);
            expect(result.actual_delivery).toBeNull();
            expect(result.status).toEqual('PENDING');
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should save shipping record to database', async () => {
            const input = { ...testShippingInput, transaction_id: testTransactionId };
            const result = await createShipping(input);

            const shippingRecords = await db.select()
                .from(shippingTable)
                .where(eq(shippingTable.id, result.id))
                .execute();

            expect(shippingRecords).toHaveLength(1);
            expect(shippingRecords[0].transaction_id).toEqual(testTransactionId);
            expect(shippingRecords[0].shipping_address).toEqual('456 Oak Ave, Springfield, IL 62701');
            expect(parseFloat(shippingRecords[0].shipping_cost)).toEqual(15.99);
        });

        it('should throw error for non-existent transaction', async () => {
            const input = { ...testShippingInput, transaction_id: 99999 };
            
            await expect(createShipping(input)).rejects.toThrow(/transaction.*not found/i);
        });

        it('should handle null optional fields', async () => {
            const input = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: null,
                carrier: null,
                shipping_cost: 15.99,
                estimated_delivery: null
            };
            
            const result = await createShipping(input);

            expect(result.tracking_number).toBeNull();
            expect(result.carrier).toBeNull();
            expect(result.estimated_delivery).toBeNull();
        });
    });

    describe('getShippingByTransaction', () => {
        it('should return shipping record for transaction', async () => {
            const input: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: 'TRK123456789',
                carrier: 'FedEx',
                shipping_cost: 12.50,
                estimated_delivery: new Date('2024-01-20')
            };
            
            const created = await createShipping(input);
            const result = await getShippingByTransaction(testTransactionId);

            expect(result).not.toBeNull();
            expect(result!.id).toEqual(created.id);
            expect(result!.transaction_id).toEqual(testTransactionId);
            expect(result!.carrier).toEqual('FedEx');
            expect(result!.shipping_cost).toEqual(12.50);
        });

        it('should return null for non-existent transaction', async () => {
            const result = await getShippingByTransaction(99999);
            expect(result).toBeNull();
        });
    });

    describe('updateShippingStatus', () => {
        let shippingId: number;

        beforeEach(async () => {
            const input: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: 'TRK123456789',
                carrier: 'DHL',
                shipping_cost: 18.75,
                estimated_delivery: new Date('2024-01-25')
            };
            
            const created = await createShipping(input);
            shippingId = created.id;
        });

        it('should update shipping status', async () => {
            const result = await updateShippingStatus(shippingId, 'SHIPPED', 'TRK987654321');

            expect(result.id).toEqual(shippingId);
            expect(result.status).toEqual('SHIPPED');
            expect(result.tracking_number).toEqual('TRK987654321');
            expect(result.actual_delivery).toBeNull();
        });

        it('should set actual delivery date when delivered', async () => {
            const result = await updateShippingStatus(shippingId, 'DELIVERED');

            expect(result.status).toEqual('DELIVERED');
            expect(result.actual_delivery).toBeInstanceOf(Date);
        });

        it('should update without tracking number', async () => {
            const result = await updateShippingStatus(shippingId, 'PROCESSING');

            expect(result.status).toEqual('PROCESSING');
            expect(result.tracking_number).toEqual('TRK123456789'); // Should remain unchanged
        });

        it('should throw error for non-existent shipping record', async () => {
            await expect(updateShippingStatus(99999, 'SHIPPED')).rejects.toThrow(/shipping record.*not found/i);
        });
    });

    describe('printShippingLabel', () => {
        let shippingId: number;

        beforeEach(async () => {
            const input: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: 'TRK123456789',
                carrier: 'USPS',
                shipping_cost: 8.99,
                estimated_delivery: new Date('2024-01-30')
            };
            
            const created = await createShipping(input);
            shippingId = created.id;
        });

        it('should generate shipping label data', async () => {
            const result = await printShippingLabel(shippingId);

            expect(result.labelData).toBeDefined();
            expect(typeof result.labelData).toBe('string');

            // Parse and verify label data structure
            const labelData = JSON.parse(result.labelData);
            expect(labelData.shippingId).toEqual(shippingId);
            expect(labelData.transactionId).toEqual(testTransactionId);
            expect(labelData.address).toEqual('456 Oak Ave, Springfield, IL 62701');
            expect(labelData.trackingNumber).toEqual('TRK123456789');
            expect(labelData.carrier).toEqual('USPS');
            expect(labelData.generatedAt).toBeDefined();
        });

        it('should throw error for non-existent shipping record', async () => {
            await expect(printShippingLabel(99999)).rejects.toThrow(/shipping record.*not found/i);
        });
    });

    describe('getShippingsList', () => {
        it('should return empty list initially', async () => {
            const result = await getShippingsList();
            expect(result).toEqual([]);
        });

        it('should return all shipping records', async () => {
            // Create multiple shipping records
            const input1: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '123 First St',
                tracking_number: 'TRK001',
                carrier: 'UPS',
                shipping_cost: 10.00,
                estimated_delivery: null
            };

            const created1 = await createShipping(input1);

            // Create another transaction for second shipping
            const transaction2Id = await createTestTransaction(testUserId, testCustomerId);
            const input2: CreateShippingInput = {
                transaction_id: transaction2Id,
                shipping_address: '456 Second Ave',
                tracking_number: 'TRK002',
                carrier: 'FedEx',
                shipping_cost: 15.50,
                estimated_delivery: new Date('2024-02-01')
            };

            const created2 = await createShipping(input2);

            const result = await getShippingsList();

            expect(result).toHaveLength(2);
            expect(result.find(s => s.id === created1.id)).toBeDefined();
            expect(result.find(s => s.id === created2.id)).toBeDefined();
            
            // Verify numeric conversion
            result.forEach(shipping => {
                expect(typeof shipping.shipping_cost).toBe('number');
            });
        });
    });

    describe('assignPackingResponsibility', () => {
        let shippingId: number;

        beforeEach(async () => {
            const input: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: 'TRK123456789',
                carrier: 'UPS',
                shipping_cost: 15.99,
                estimated_delivery: new Date('2024-01-15')
            };
            
            const created = await createShipping(input);
            shippingId = created.id;
        });

        it('should assign packing responsibility', async () => {
            const result = await assignPackingResponsibility(shippingId, testUserId);

            expect(result.success).toBe(true);

            // Verify status was updated to PROCESSING
            const updated = await db.select()
                .from(shippingTable)
                .where(eq(shippingTable.id, shippingId))
                .execute();

            expect(updated[0].status).toEqual('PROCESSING');
        });

        it('should throw error for non-existent shipping record', async () => {
            await expect(assignPackingResponsibility(99999, testUserId)).rejects.toThrow(/shipping record.*not found/i);
        });
    });

    describe('updatePackingStatus', () => {
        let shippingId: number;

        beforeEach(async () => {
            const input: CreateShippingInput = {
                transaction_id: testTransactionId,
                shipping_address: '456 Oak Ave, Springfield, IL 62701',
                tracking_number: 'TRK123456789',
                carrier: 'UPS',
                shipping_cost: 15.99,
                estimated_delivery: new Date('2024-01-15')
            };
            
            const created = await createShipping(input);
            shippingId = created.id;
        });

        it('should update status to PACKED when packed is true', async () => {
            const result = await updatePackingStatus(shippingId, true);

            expect(result.success).toBe(true);

            // Verify status was updated
            const updated = await db.select()
                .from(shippingTable)
                .where(eq(shippingTable.id, shippingId))
                .execute();

            expect(updated[0].status).toEqual('PACKED');
        });

        it('should update status to PROCESSING when packed is false', async () => {
            const result = await updatePackingStatus(shippingId, false);

            expect(result.success).toBe(true);

            // Verify status was updated
            const updated = await db.select()
                .from(shippingTable)
                .where(eq(shippingTable.id, shippingId))
                .execute();

            expect(updated[0].status).toEqual('PROCESSING');
        });

        it('should throw error for non-existent shipping record', async () => {
            await expect(updatePackingStatus(99999, true)).rejects.toThrow(/shipping record.*not found/i);
        });
    });
});