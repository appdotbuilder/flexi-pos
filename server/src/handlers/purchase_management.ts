import { db } from '../db';
import { 
  purchaseOrdersTable, 
  purchaseOrderItemsTable, 
  warehousesTable,
  usersTable,
  productsTable,
  inventoryTable
} from '../db/schema';
import { 
  type PurchaseOrder, 
  type CreatePurchaseOrderInput,
  type OrderStatus
} from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  try {
    // Verify warehouse exists
    const warehouse = await db.select()
      .from(warehousesTable)
      .where(eq(warehousesTable.id, input.warehouse_id))
      .execute();

    if (warehouse.length === 0) {
      throw new Error(`Warehouse with id ${input.warehouse_id} not found`);
    }

    // Verify all products exist
    for (const item of input.items) {
      const product = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .execute();

      if (product.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }
    }

    // Create purchase order
    const result = await db.insert(purchaseOrdersTable)
      .values({
        supplier_name: input.supplier_name,
        supplier_email: input.supplier_email,
        supplier_phone: input.supplier_phone,
        warehouse_id: input.warehouse_id,
        subtotal: input.subtotal.toString(),
        tax_amount: input.tax_amount.toString(),
        total_amount: input.total_amount.toString(),
        notes: input.notes,
        created_by: 1 // Should be from authenticated user context
      })
      .returning()
      .execute();

    const purchaseOrder = result[0];

    // Create purchase order items
    for (const item of input.items) {
      await db.insert(purchaseOrderItemsTable)
        .values({
          purchase_order_id: purchaseOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost.toString(),
          total_cost: item.total_cost.toString()
        })
        .execute();
    }

    // Convert numeric fields back to numbers
    return {
      ...purchaseOrder,
      subtotal: parseFloat(purchaseOrder.subtotal),
      tax_amount: parseFloat(purchaseOrder.tax_amount),
      total_amount: parseFloat(purchaseOrder.total_amount)
    };
  } catch (error) {
    console.error('Purchase order creation failed:', error);
    throw error;
  }
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const results = await db.select()
      .from(purchaseOrdersTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(order => ({
      ...order,
      subtotal: parseFloat(order.subtotal),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    throw error;
  }
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
  try {
    const results = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const order = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...order,
      subtotal: parseFloat(order.subtotal),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Failed to fetch purchase order:', error);
    throw error;
  }
}

export async function updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrder> {
  try {
    // Verify purchase order exists
    const existingOrder = await getPurchaseOrderById(id);
    if (!existingOrder) {
      throw new Error(`Purchase order with id ${id} not found`);
    }

    const results = await db.update(purchaseOrdersTable)
      .set({ 
        status: status as OrderStatus,
        updated_at: new Date()
      })
      .where(eq(purchaseOrdersTable.id, id))
      .returning()
      .execute();

    const order = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...order,
      subtotal: parseFloat(order.subtotal),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Failed to update purchase order status:', error);
    throw error;
  }
}

export async function processPurchaseReturn(purchaseOrderId: number, returnReason: string): Promise<{ success: boolean }> {
  try {
    // Verify purchase order exists and is delivered
    const existingOrder = await getPurchaseOrderById(purchaseOrderId);
    if (!existingOrder) {
      throw new Error(`Purchase order with id ${purchaseOrderId} not found`);
    }

    if (existingOrder.status !== 'DELIVERED') {
      throw new Error('Can only process returns for delivered purchase orders');
    }

    // Get purchase order items to reverse inventory updates
    const items = await db.select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchase_order_id, purchaseOrderId))
      .execute();

    // Reverse inventory for each item
    for (const item of items) {
      const inventory = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, item.product_id),
          eq(inventoryTable.warehouse_id, existingOrder.warehouse_id)
        ))
        .execute();

      if (inventory.length > 0) {
        const currentInventory = inventory[0];
        const newQuantity = Math.max(0, currentInventory.quantity - item.quantity);
        
        await db.update(inventoryTable)
          .set({ 
            quantity: newQuantity,
            updated_at: new Date()
          })
          .where(eq(inventoryTable.id, currentInventory.id))
          .execute();
      }
    }

    // Update purchase order status to cancelled with return reason
    await db.update(purchaseOrdersTable)
      .set({ 
        status: 'CANCELLED',
        notes: `RETURN: ${returnReason}`,
        updated_at: new Date()
      })
      .where(eq(purchaseOrdersTable.id, purchaseOrderId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Failed to process purchase return:', error);
    throw error;
  }
}

export async function receivePurchaseOrder(id: number): Promise<PurchaseOrder> {
  try {
    // Verify purchase order exists
    const existingOrder = await getPurchaseOrderById(id);
    if (!existingOrder) {
      throw new Error(`Purchase order with id ${id} not found`);
    }

    if (existingOrder.status === 'DELIVERED') {
      throw new Error('Purchase order is already delivered');
    }

    // Get purchase order items
    const items = await db.select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchase_order_id, id))
      .execute();

    // Update inventory for each item
    for (const item of items) {
      // Check if inventory record exists
      const inventory = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, item.product_id),
          eq(inventoryTable.warehouse_id, existingOrder.warehouse_id)
        ))
        .execute();

      if (inventory.length > 0) {
        // Update existing inventory
        const currentInventory = inventory[0];
        await db.update(inventoryTable)
          .set({ 
            quantity: currentInventory.quantity + item.quantity,
            updated_at: new Date()
          })
          .where(eq(inventoryTable.id, currentInventory.id))
          .execute();
      } else {
        // Create new inventory record
        await db.insert(inventoryTable)
          .values({
            product_id: item.product_id,
            warehouse_id: existingOrder.warehouse_id,
            quantity: item.quantity,
            reserved_quantity: 0,
            reorder_level: 10 // Default reorder level
          })
          .execute();
      }
    }

    // Update purchase order status to delivered
    const results = await db.update(purchaseOrdersTable)
      .set({ 
        status: 'DELIVERED',
        updated_at: new Date()
      })
      .where(eq(purchaseOrdersTable.id, id))
      .returning()
      .execute();

    const order = results[0];
    
    // Convert numeric fields back to numbers
    return {
      ...order,
      subtotal: parseFloat(order.subtotal),
      tax_amount: parseFloat(order.tax_amount),
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Failed to receive purchase order:', error);
    throw error;
  }
}