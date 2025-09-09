import { db } from '../db';
import { shippingTable, salesTransactionsTable } from '../db/schema';
import { 
    type Shipping, 
    type CreateShippingInput,
    type OrderStatus
} from '../schema';
import { eq } from 'drizzle-orm';

export async function createShipping(input: CreateShippingInput): Promise<Shipping> {
    try {
        // Verify transaction exists
        const transaction = await db.select()
            .from(salesTransactionsTable)
            .where(eq(salesTransactionsTable.id, input.transaction_id))
            .execute();

        if (transaction.length === 0) {
            throw new Error(`Sales transaction with id ${input.transaction_id} not found`);
        }

        // Insert shipping record
        const result = await db.insert(shippingTable)
            .values({
                transaction_id: input.transaction_id,
                shipping_address: input.shipping_address,
                tracking_number: input.tracking_number,
                carrier: input.carrier,
                shipping_cost: input.shipping_cost.toString(), // Convert number to string for numeric column
                estimated_delivery: input.estimated_delivery
            })
            .returning()
            .execute();

        const shipping = result[0];
        return {
            ...shipping,
            shipping_cost: parseFloat(shipping.shipping_cost) // Convert string back to number
        };
    } catch (error) {
        console.error('Shipping creation failed:', error);
        throw error;
    }
}

export async function getShippingByTransaction(transactionId: number): Promise<Shipping | null> {
    try {
        const results = await db.select()
            .from(shippingTable)
            .where(eq(shippingTable.transaction_id, transactionId))
            .execute();

        if (results.length === 0) {
            return null;
        }

        const shipping = results[0];
        return {
            ...shipping,
            shipping_cost: parseFloat(shipping.shipping_cost) // Convert string back to number
        };
    } catch (error) {
        console.error('Get shipping by transaction failed:', error);
        throw error;
    }
}

export async function updateShippingStatus(id: number, status: string, trackingNumber?: string): Promise<Shipping> {
    try {
        // Verify shipping record exists
        const existing = await db.select()
            .from(shippingTable)
            .where(eq(shippingTable.id, id))
            .execute();

        if (existing.length === 0) {
            throw new Error(`Shipping record with id ${id} not found`);
        }

        // Prepare update data
        const updateData: any = {
            status: status as OrderStatus
        };

        if (trackingNumber !== undefined) {
            updateData.tracking_number = trackingNumber;
        }

        // Set actual delivery date if status is delivered
        if (status === 'DELIVERED') {
            updateData.actual_delivery = new Date();
        }

        // Update shipping record
        const result = await db.update(shippingTable)
            .set(updateData)
            .where(eq(shippingTable.id, id))
            .returning()
            .execute();

        const shipping = result[0];
        return {
            ...shipping,
            shipping_cost: parseFloat(shipping.shipping_cost) // Convert string back to number
        };
    } catch (error) {
        console.error('Update shipping status failed:', error);
        throw error;
    }
}

export async function printShippingLabel(shippingId: number): Promise<{ labelData: string }> {
    try {
        // Verify shipping record exists
        const results = await db.select()
            .from(shippingTable)
            .where(eq(shippingTable.id, shippingId))
            .execute();

        if (results.length === 0) {
            throw new Error(`Shipping record with id ${shippingId} not found`);
        }

        const shipping = results[0];

        // Generate label data (in real implementation, this would integrate with shipping provider APIs)
        const labelData = JSON.stringify({
            shippingId: shipping.id,
            transactionId: shipping.transaction_id,
            address: shipping.shipping_address,
            trackingNumber: shipping.tracking_number,
            carrier: shipping.carrier,
            estimatedDelivery: shipping.estimated_delivery,
            generatedAt: new Date().toISOString()
        });

        return { labelData };
    } catch (error) {
        console.error('Print shipping label failed:', error);
        throw error;
    }
}

export async function getShippingsList(): Promise<Shipping[]> {
    try {
        const results = await db.select()
            .from(shippingTable)
            .execute();

        return results.map(shipping => ({
            ...shipping,
            shipping_cost: parseFloat(shipping.shipping_cost) // Convert string back to number
        }));
    } catch (error) {
        console.error('Get shipping list failed:', error);
        throw error;
    }
}

export async function assignPackingResponsibility(shippingId: number, assignedTo: number): Promise<{ success: boolean }> {
    try {
        // Verify shipping record exists
        const existing = await db.select()
            .from(shippingTable)
            .where(eq(shippingTable.id, shippingId))
            .execute();

        if (existing.length === 0) {
            throw new Error(`Shipping record with id ${shippingId} not found`);
        }

        // In a full implementation, this would update an assignment table or field
        // For now, we'll update the status to PROCESSING to indicate assignment
        await db.update(shippingTable)
            .set({ status: 'PROCESSING' })
            .where(eq(shippingTable.id, shippingId))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Assign packing responsibility failed:', error);
        throw error;
    }
}

export async function updatePackingStatus(shippingId: number, packed: boolean): Promise<{ success: boolean }> {
    try {
        // Verify shipping record exists
        const existing = await db.select()
            .from(shippingTable)
            .where(eq(shippingTable.id, shippingId))
            .execute();

        if (existing.length === 0) {
            throw new Error(`Shipping record with id ${shippingId} not found`);
        }

        // Update status based on packing status
        const newStatus = packed ? 'PACKED' : 'PROCESSING';
        
        await db.update(shippingTable)
            .set({ status: newStatus })
            .where(eq(shippingTable.id, shippingId))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Update packing status failed:', error);
        throw error;
    }
}