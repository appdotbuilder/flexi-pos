import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
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
  type CreatePurchaseOrderInput,
  type OrderStatus
} from '../schema';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  processPurchaseReturn,
  receivePurchaseOrder
} from '../handlers/purchase_management';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  role: 'ADMINISTRATOR' as const,
  first_name: 'Test',
  last_name: 'User'
};

const testWarehouse = {
  name: 'Test Warehouse',
  address: '123 Test St',
  phone: '555-0123',
  email: 'warehouse@test.com'
};

const testProduct1 = {
  sku: 'TEST001',
  name: 'Test Product 1',
  description: 'First test product',
  retail_price: 19.99,
  wholesale_price: 15.99,
  cost_price: 10.99,
  barcode: '1234567890'
};

const testProduct2 = {
  sku: 'TEST002',
  name: 'Test Product 2',
  description: 'Second test product',
  retail_price: 29.99,
  wholesale_price: 25.99,
  cost_price: 20.99,
  barcode: '0987654321'
};

const testPurchaseOrderInput: CreatePurchaseOrderInput = {
  supplier_name: 'Test Supplier Co.',
  supplier_email: 'supplier@test.com',
  supplier_phone: '555-0456',
  warehouse_id: 1,
  subtotal: 100.00,
  tax_amount: 8.00,
  total_amount: 108.00,
  notes: 'Test purchase order',
  items: [
    {
      product_id: 1,
      quantity: 5,
      unit_cost: 10.00,
      total_cost: 50.00
    },
    {
      product_id: 2,
      quantity: 2,
      unit_cost: 25.00,
      total_cost: 50.00
    }
  ]
};

describe('Purchase Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let warehouseId: number;
  let product1Id: number;
  let product2Id: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const warehouseResult = await db.insert(warehousesTable)
      .values(testWarehouse)
      .returning()
      .execute();
    warehouseId = warehouseResult[0].id;

    const product1Result = await db.insert(productsTable)
      .values({
        ...testProduct1,
        retail_price: testProduct1.retail_price.toString(),
        wholesale_price: testProduct1.wholesale_price.toString(),
        cost_price: testProduct1.cost_price.toString()
      })
      .returning()
      .execute();
    product1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        ...testProduct2,
        retail_price: testProduct2.retail_price.toString(),
        wholesale_price: testProduct2.wholesale_price.toString(),
        cost_price: testProduct2.cost_price.toString()
      })
      .returning()
      .execute();
    product2Id = product2Result[0].id;

    // Update test input with actual IDs
    testPurchaseOrderInput.warehouse_id = warehouseId;
    testPurchaseOrderInput.items[0].product_id = product1Id;
    testPurchaseOrderInput.items[1].product_id = product2Id;
  });

  describe('createPurchaseOrder', () => {
    it('should create a purchase order with items', async () => {
      const result = await createPurchaseOrder(testPurchaseOrderInput);

      expect(result.supplier_name).toEqual('Test Supplier Co.');
      expect(result.supplier_email).toEqual('supplier@test.com');
      expect(result.supplier_phone).toEqual('555-0456');
      expect(result.warehouse_id).toEqual(warehouseId);
      expect(result.status).toEqual('PENDING');
      expect(result.subtotal).toEqual(100.00);
      expect(result.tax_amount).toEqual(8.00);
      expect(result.total_amount).toEqual(108.00);
      expect(result.notes).toEqual('Test purchase order');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save purchase order to database', async () => {
      const result = await createPurchaseOrder(testPurchaseOrderInput);

      const orders = await db.select()
        .from(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, result.id))
        .execute();

      expect(orders).toHaveLength(1);
      expect(orders[0].supplier_name).toEqual('Test Supplier Co.');
      expect(parseFloat(orders[0].subtotal)).toEqual(100.00);
      expect(parseFloat(orders[0].total_amount)).toEqual(108.00);
    });

    it('should create purchase order items', async () => {
      const result = await createPurchaseOrder(testPurchaseOrderInput);

      const items = await db.select()
        .from(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchase_order_id, result.id))
        .execute();

      expect(items).toHaveLength(2);
      
      const item1 = items.find(item => item.product_id === product1Id);
      const item2 = items.find(item => item.product_id === product2Id);
      
      expect(item1).toBeDefined();
      expect(item1!.quantity).toEqual(5);
      expect(parseFloat(item1!.unit_cost)).toEqual(10.00);
      expect(parseFloat(item1!.total_cost)).toEqual(50.00);

      expect(item2).toBeDefined();
      expect(item2!.quantity).toEqual(2);
      expect(parseFloat(item2!.unit_cost)).toEqual(25.00);
      expect(parseFloat(item2!.total_cost)).toEqual(50.00);
    });

    it('should throw error for invalid warehouse', async () => {
      const invalidInput = {
        ...testPurchaseOrderInput,
        warehouse_id: 999
      };

      await expect(createPurchaseOrder(invalidInput))
        .rejects.toThrow(/warehouse with id 999 not found/i);
    });

    it('should throw error for invalid product', async () => {
      const invalidInput = {
        ...testPurchaseOrderInput,
        items: [{
          product_id: 999,
          quantity: 1,
          unit_cost: 10.00,
          total_cost: 10.00
        }]
      };

      await expect(createPurchaseOrder(invalidInput))
        .rejects.toThrow(/product with id 999 not found/i);
    });
  });

  describe('getPurchaseOrders', () => {
    it('should return all purchase orders', async () => {
      // Create two purchase orders
      await createPurchaseOrder(testPurchaseOrderInput);
      await createPurchaseOrder({
        ...testPurchaseOrderInput,
        supplier_name: 'Another Supplier'
      });

      const orders = await getPurchaseOrders();
      
      expect(orders).toHaveLength(2);
      expect(orders[0].supplier_name).toEqual('Test Supplier Co.');
      expect(orders[1].supplier_name).toEqual('Another Supplier');
      
      // Verify numeric conversion
      orders.forEach(order => {
        expect(typeof order.subtotal).toBe('number');
        expect(typeof order.tax_amount).toBe('number');
        expect(typeof order.total_amount).toBe('number');
      });
    });

    it('should return empty array when no orders exist', async () => {
      const orders = await getPurchaseOrders();
      expect(orders).toHaveLength(0);
    });
  });

  describe('getPurchaseOrderById', () => {
    it('should return purchase order by id', async () => {
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      const found = await getPurchaseOrderById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toEqual(created.id);
      expect(found!.supplier_name).toEqual('Test Supplier Co.');
      expect(found!.subtotal).toEqual(100.00);
      expect(typeof found!.subtotal).toBe('number');
    });

    it('should return null for non-existent id', async () => {
      const found = await getPurchaseOrderById(999);
      expect(found).toBeNull();
    });
  });

  describe('updatePurchaseOrderStatus', () => {
    it('should update purchase order status', async () => {
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      const updated = await updatePurchaseOrderStatus(created.id, 'PROCESSING');

      expect(updated.id).toEqual(created.id);
      expect(updated.status).toEqual('PROCESSING');
      expect(updated.updated_at).toBeInstanceOf(Date);
      expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should throw error for non-existent purchase order', async () => {
      await expect(updatePurchaseOrderStatus(999, 'PROCESSING'))
        .rejects.toThrow(/purchase order with id 999 not found/i);
    });
  });

  describe('receivePurchaseOrder', () => {
    it('should mark purchase order as delivered and update inventory', async () => {
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      const received = await receivePurchaseOrder(created.id);

      expect(received.status).toEqual('DELIVERED');
      
      // Check inventory was updated for product 1
      const inventory1 = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, product1Id),
          eq(inventoryTable.warehouse_id, warehouseId)
        ))
        .execute();
      
      expect(inventory1).toHaveLength(1);
      expect(inventory1[0].quantity).toEqual(5);

      // Check inventory was updated for product 2
      const inventory2 = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, product2Id),
          eq(inventoryTable.warehouse_id, warehouseId)
        ))
        .execute();
      
      expect(inventory2).toHaveLength(1);
      expect(inventory2[0].quantity).toEqual(2);
    });

    it('should add to existing inventory', async () => {
      // Create initial inventory
      await db.insert(inventoryTable)
        .values({
          product_id: product1Id,
          warehouse_id: warehouseId,
          quantity: 10,
          reserved_quantity: 0,
          reorder_level: 5
        })
        .execute();

      const created = await createPurchaseOrder(testPurchaseOrderInput);
      await receivePurchaseOrder(created.id);

      // Check inventory was added to existing quantity
      const inventory = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, product1Id),
          eq(inventoryTable.warehouse_id, warehouseId)
        ))
        .execute();

      expect(inventory).toHaveLength(1);
      expect(inventory[0].quantity).toEqual(15); // 10 + 5
    });

    it('should throw error for non-existent purchase order', async () => {
      await expect(receivePurchaseOrder(999))
        .rejects.toThrow(/purchase order with id 999 not found/i);
    });

    it('should throw error for already delivered order', async () => {
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      await receivePurchaseOrder(created.id);

      await expect(receivePurchaseOrder(created.id))
        .rejects.toThrow(/purchase order is already delivered/i);
    });
  });

  describe('processPurchaseReturn', () => {
    it('should process return and reverse inventory', async () => {
      // Create and receive purchase order
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      await receivePurchaseOrder(created.id);

      // Process return
      const result = await processPurchaseReturn(created.id, 'Defective items');
      expect(result.success).toBe(true);

      // Check order status updated to cancelled
      const updatedOrder = await getPurchaseOrderById(created.id);
      expect(updatedOrder!.status).toEqual('CANCELLED');
      expect(updatedOrder!.notes).toContain('RETURN: Defective items');

      // Check inventory was reversed
      const inventory1 = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, product1Id),
          eq(inventoryTable.warehouse_id, warehouseId)
        ))
        .execute();

      expect(inventory1[0].quantity).toEqual(0); // 5 - 5 = 0
    });

    it('should not reduce inventory below zero', async () => {
      // Create initial inventory with low quantity
      await db.insert(inventoryTable)
        .values({
          product_id: product1Id,
          warehouse_id: warehouseId,
          quantity: 2,
          reserved_quantity: 0,
          reorder_level: 5
        })
        .execute();

      const created = await createPurchaseOrder(testPurchaseOrderInput);
      await receivePurchaseOrder(created.id);
      await processPurchaseReturn(created.id, 'Test return');

      // Check inventory doesn't go below zero
      const inventory = await db.select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.product_id, product1Id),
          eq(inventoryTable.warehouse_id, warehouseId)
        ))
        .execute();

      expect(inventory[0].quantity).toEqual(2); // Initial 2 + received 5 - returned 5 = 2
    });

    it('should throw error for non-existent purchase order', async () => {
      await expect(processPurchaseReturn(999, 'Test reason'))
        .rejects.toThrow(/purchase order with id 999 not found/i);
    });

    it('should throw error for non-delivered purchase order', async () => {
      const created = await createPurchaseOrder(testPurchaseOrderInput);
      
      await expect(processPurchaseReturn(created.id, 'Test reason'))
        .rejects.toThrow(/can only process returns for delivered purchase orders/i);
    });
  });
});