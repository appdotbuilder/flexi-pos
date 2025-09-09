import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, warehousesTable, inventoryTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
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
} from '../handlers/inventory_management';
import { 
    type CreateProductInput, 
    type CreateWarehouseInput, 
    type UpdateInventoryInput, 
    type InventoryReportInput 
} from '../schema';

const testProductInput: CreateProductInput = {
    sku: 'TEST001',
    name: 'Test Product',
    description: 'A product for testing',
    retail_price: 19.99,
    wholesale_price: 15.99,
    cost_price: 12.99,
    barcode: null
};

const testWarehouseInput: CreateWarehouseInput = {
    name: 'Test Warehouse',
    address: '123 Test Street, Test City, TC 12345',
    phone: '+1-555-0123',
    email: 'test@warehouse.com'
};

describe('Product Management', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('createProduct', () => {
        it('should create a product with all fields', async () => {
            const result = await createProduct(testProductInput);

            expect(result.sku).toEqual('TEST001');
            expect(result.name).toEqual('Test Product');
            expect(result.description).toEqual('A product for testing');
            expect(result.retail_price).toEqual(19.99);
            expect(result.wholesale_price).toEqual(15.99);
            expect(result.cost_price).toEqual(12.99);
            expect(result.barcode).toBeNull();
            expect(result.is_active).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should save product to database with numeric conversion', async () => {
            const result = await createProduct(testProductInput);

            const products = await db.select()
                .from(productsTable)
                .where(eq(productsTable.id, result.id))
                .execute();

            expect(products).toHaveLength(1);
            expect(products[0].name).toEqual('Test Product');
            expect(parseFloat(products[0].retail_price)).toEqual(19.99);
            expect(parseFloat(products[0].wholesale_price)).toEqual(15.99);
            expect(parseFloat(products[0].cost_price)).toEqual(12.99);
        });

        it('should handle product with barcode', async () => {
            const inputWithBarcode: CreateProductInput = {
                ...testProductInput,
                barcode: 'BAR123456789'
            };

            const result = await createProduct(inputWithBarcode);
            expect(result.barcode).toEqual('BAR123456789');
        });
    });

    describe('getProducts', () => {
        it('should return active products only', async () => {
            await createProduct(testProductInput);
            await createProduct({
                ...testProductInput,
                sku: 'TEST002',
                name: 'Test Product 2'
            });

            // Manually set one product as inactive
            await db.update(productsTable)
                .set({ is_active: false })
                .where(eq(productsTable.sku, 'TEST002'))
                .execute();

            const results = await getProducts();

            expect(results).toHaveLength(1);
            expect(results[0].sku).toEqual('TEST001');
            expect(results[0].name).toEqual('Test Product');
            expect(typeof results[0].retail_price).toBe('number');
        });

        it('should return empty array when no products exist', async () => {
            const results = await getProducts();
            expect(results).toHaveLength(0);
        });
    });

    describe('getProductById', () => {
        it('should return product when found', async () => {
            const created = await createProduct(testProductInput);
            const result = await getProductById(created.id);

            expect(result).toBeDefined();
            expect(result!.id).toEqual(created.id);
            expect(result!.name).toEqual('Test Product');
            expect(typeof result!.retail_price).toBe('number');
        });

        it('should return null when product not found', async () => {
            const result = await getProductById(999);
            expect(result).toBeNull();
        });

        it('should return null for inactive product', async () => {
            const created = await createProduct(testProductInput);
            
            // Deactivate the product
            await db.update(productsTable)
                .set({ is_active: false })
                .where(eq(productsTable.id, created.id))
                .execute();

            const result = await getProductById(created.id);
            expect(result).toBeNull();
        });
    });

    describe('updateProduct', () => {
        it('should update product fields', async () => {
            const created = await createProduct(testProductInput);
            
            const updates = {
                name: 'Updated Product Name',
                retail_price: 24.99
            };

            const result = await updateProduct(created.id, updates);

            expect(result.name).toEqual('Updated Product Name');
            expect(result.retail_price).toEqual(24.99);
            expect(result.wholesale_price).toEqual(15.99); // Unchanged
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should throw error when product not found', async () => {
            await expect(updateProduct(999, { name: 'Updated' }))
                .rejects.toThrow(/not found/i);
        });

        it('should update numeric fields correctly', async () => {
            const created = await createProduct(testProductInput);
            
            const updates = {
                retail_price: 29.99,
                wholesale_price: 19.99,
                cost_price: 14.99
            };

            const result = await updateProduct(created.id, updates);

            expect(result.retail_price).toEqual(29.99);
            expect(result.wholesale_price).toEqual(19.99);
            expect(result.cost_price).toEqual(14.99);
        });
    });

    describe('generateProductBarcode', () => {
        it('should generate barcode for product without one', async () => {
            const created = await createProduct(testProductInput);
            const result = await generateProductBarcode(created.id);

            expect(result.barcode).toMatch(/^BAR\d{8}$/);
            expect(result.barcode).toEqual(`BAR${created.id.toString().padStart(8, '0')}`);

            // Verify it was saved to database
            const updated = await getProductById(created.id);
            expect(updated!.barcode).toEqual(result.barcode);
        });

        it('should return existing barcode if present', async () => {
            const inputWithBarcode: CreateProductInput = {
                ...testProductInput,
                barcode: 'EXISTING123'
            };

            const created = await createProduct(inputWithBarcode);
            const result = await generateProductBarcode(created.id);

            expect(result.barcode).toEqual('EXISTING123');
        });

        it('should throw error for non-existent product', async () => {
            await expect(generateProductBarcode(999))
                .rejects.toThrow(/not found/i);
        });
    });
});

describe('Warehouse Management', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('createWarehouse', () => {
        it('should create warehouse with all fields', async () => {
            const result = await createWarehouse(testWarehouseInput);

            expect(result.name).toEqual('Test Warehouse');
            expect(result.address).toEqual('123 Test Street, Test City, TC 12345');
            expect(result.phone).toEqual('+1-555-0123');
            expect(result.email).toEqual('test@warehouse.com');
            expect(result.is_active).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should handle nullable fields', async () => {
            const minimalInput: CreateWarehouseInput = {
                name: 'Minimal Warehouse',
                address: '456 Basic Street',
                phone: null,
                email: null
            };

            const result = await createWarehouse(minimalInput);
            expect(result.name).toEqual('Minimal Warehouse');
            expect(result.phone).toBeNull();
            expect(result.email).toBeNull();
        });
    });

    describe('getWarehouses', () => {
        it('should return active warehouses only', async () => {
            await createWarehouse(testWarehouseInput);
            await createWarehouse({
                ...testWarehouseInput,
                name: 'Second Warehouse'
            });

            // Deactivate one warehouse
            await db.update(warehousesTable)
                .set({ is_active: false })
                .where(eq(warehousesTable.name, 'Second Warehouse'))
                .execute();

            const results = await getWarehouses();
            expect(results).toHaveLength(1);
            expect(results[0].name).toEqual('Test Warehouse');
        });

        it('should return empty array when no warehouses exist', async () => {
            const results = await getWarehouses();
            expect(results).toHaveLength(0);
        });
    });
});

describe('Inventory Management', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testProduct: any;
    let testWarehouse: any;

    beforeEach(async () => {
        testProduct = await createProduct(testProductInput);
        testWarehouse = await createWarehouse(testWarehouseInput);
    });

    describe('updateInventory', () => {
        it('should create new inventory record', async () => {
            const input: UpdateInventoryInput = {
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 100,
                reorder_level: 10
            };

            const result = await updateInventory(input);

            expect(result.product_id).toEqual(testProduct.id);
            expect(result.warehouse_id).toEqual(testWarehouse.id);
            expect(result.quantity).toEqual(100);
            expect(result.reorder_level).toEqual(10);
            expect(result.reserved_quantity).toEqual(0);
        });

        it('should update existing inventory record', async () => {
            const input: UpdateInventoryInput = {
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 100,
                reorder_level: 10
            };

            // Create initial inventory
            await updateInventory(input);

            // Update the same inventory
            const updateInput: UpdateInventoryInput = {
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 150
            };

            const result = await updateInventory(updateInput);

            expect(result.quantity).toEqual(150);
            expect(result.reorder_level).toEqual(10); // Should remain unchanged

            // Verify only one record exists
            const inventoryRecords = await db.select()
                .from(inventoryTable)
                .where(and(
                    eq(inventoryTable.product_id, testProduct.id),
                    eq(inventoryTable.warehouse_id, testWarehouse.id)
                ))
                .execute();

            expect(inventoryRecords).toHaveLength(1);
        });

        it('should throw error for invalid product', async () => {
            const input: UpdateInventoryInput = {
                product_id: 999,
                warehouse_id: testWarehouse.id,
                quantity: 100
            };

            await expect(updateInventory(input))
                .rejects.toThrow(/product not found/i);
        });

        it('should throw error for invalid warehouse', async () => {
            const input: UpdateInventoryInput = {
                product_id: testProduct.id,
                warehouse_id: 999,
                quantity: 100
            };

            await expect(updateInventory(input))
                .rejects.toThrow(/warehouse not found/i);
        });
    });

    describe('getInventoryByWarehouse', () => {
        it('should return inventory for specific warehouse', async () => {
            // Create second warehouse and product
            const secondWarehouse = await createWarehouse({
                ...testWarehouseInput,
                name: 'Second Warehouse'
            });

            // Create inventory in both warehouses
            await updateInventory({
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 100
            });

            await updateInventory({
                product_id: testProduct.id,
                warehouse_id: secondWarehouse.id,
                quantity: 200
            });

            const results = await getInventoryByWarehouse(testWarehouse.id);

            expect(results).toHaveLength(1);
            expect(results[0].warehouse_id).toEqual(testWarehouse.id);
            expect(results[0].quantity).toEqual(100);
        });

        it('should return empty array for warehouse with no inventory', async () => {
            const results = await getInventoryByWarehouse(testWarehouse.id);
            expect(results).toHaveLength(0);
        });
    });

    describe('getLowStockProducts', () => {
        it('should return products below reorder level', async () => {
            // Create inventory with low stock
            await updateInventory({
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 5,
                reorder_level: 10
            });

            // Create second product with adequate stock
            const secondProduct = await createProduct({
                ...testProductInput,
                sku: 'TEST002',
                name: 'Second Product'
            });

            await updateInventory({
                product_id: secondProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 20,
                reorder_level: 10
            });

            const results = await getLowStockProducts();

            expect(results).toHaveLength(1);
            expect(results[0].product_id).toEqual(testProduct.id);
            expect(results[0].quantity).toEqual(5);
            expect(results[0].reorder_level).toEqual(10);
        });

        it('should return empty array when no low stock products', async () => {
            await updateInventory({
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 100,
                reorder_level: 10
            });

            const results = await getLowStockProducts();
            expect(results).toHaveLength(0);
        });
    });

    describe('getInventoryReport', () => {
        beforeEach(async () => {
            // Set up test inventory data
            await updateInventory({
                product_id: testProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 5, // Low stock
                reorder_level: 10
            });

            const secondProduct = await createProduct({
                ...testProductInput,
                sku: 'TEST002',
                name: 'Second Product',
                cost_price: 10.00
            });

            await updateInventory({
                product_id: secondProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 0, // Out of stock
                reorder_level: 5
            });

            const thirdProduct = await createProduct({
                ...testProductInput,
                sku: 'TEST003',
                name: 'Third Product',
                cost_price: 8.00
            });

            await updateInventory({
                product_id: thirdProduct.id,
                warehouse_id: testWarehouse.id,
                quantity: 20, // Good stock
                reorder_level: 10
            });
        });

        it('should generate complete inventory report', async () => {
            const input: InventoryReportInput = {
                warehouse_id: testWarehouse.id
            };

            const result = await getInventoryReport(input);

            expect(result.warehouse_id).toEqual(testWarehouse.id);
            expect(result.total_products).toEqual(3);
            expect(result.low_stock_count).toEqual(2); // 5 < 10 and 0 < 5
            expect(result.out_of_stock_count).toEqual(1);
            expect(result.inventory_value).toBeGreaterThan(0);
            expect(result.items).toHaveLength(3);

            // Check individual items structure
            const lowStockItem = result.items.find((item: any) => item.quantity === 5);
            expect(lowStockItem).toBeDefined();
            expect(lowStockItem.is_low_stock).toBe(true);
            expect(lowStockItem.is_out_of_stock).toBe(false);
            expect(typeof lowStockItem.cost_price).toBe('number');
            expect(typeof lowStockItem.total_value).toBe('number');

            const outOfStockItem = result.items.find((item: any) => item.quantity === 0);
            expect(outOfStockItem.is_out_of_stock).toBe(true);
        });

        it('should filter by low stock only', async () => {
            const input: InventoryReportInput = {
                warehouse_id: testWarehouse.id,
                low_stock_only: true
            };

            const result = await getInventoryReport(input);

            expect(result.total_products).toEqual(2);
            expect(result.items).toHaveLength(2);
            expect(result.items.every((item: any) => item.is_low_stock)).toBe(true);
        });

        it('should generate report for all warehouses', async () => {
            const input: InventoryReportInput = {};

            const result = await getInventoryReport(input);

            expect(result.warehouse_id).toBeUndefined();
            expect(result.total_products).toEqual(3);
            expect(result.items).toHaveLength(3);
        });

        it('should return empty report for non-existent warehouse', async () => {
            const input: InventoryReportInput = {
                warehouse_id: 999
            };

            const result = await getInventoryReport(input);

            expect(result.total_products).toEqual(0);
            expect(result.inventory_value).toEqual(0);
            expect(result.items).toHaveLength(0);
        });
    });
});