import { db } from '../db';
import { 
    productsTable, 
    warehousesTable, 
    inventoryTable 
} from '../db/schema';
import { 
    type Product, 
    type CreateProductInput, 
    type Inventory, 
    type UpdateInventoryInput,
    type Warehouse,
    type CreateWarehouseInput,
    type InventoryReportInput
} from '../schema';
import { eq, and, lt, SQL } from 'drizzle-orm';

// Product management
export async function createProduct(input: CreateProductInput): Promise<Product> {
    try {
        const result = await db.insert(productsTable)
            .values({
                sku: input.sku,
                name: input.name,
                description: input.description,
                retail_price: input.retail_price.toString(),
                wholesale_price: input.wholesale_price.toString(),
                cost_price: input.cost_price.toString(),
                barcode: input.barcode
            })
            .returning()
            .execute();

        const product = result[0];
        return {
            ...product,
            retail_price: parseFloat(product.retail_price),
            wholesale_price: parseFloat(product.wholesale_price),
            cost_price: parseFloat(product.cost_price)
        };
    } catch (error) {
        console.error('Product creation failed:', error);
        throw error;
    }
}

export async function getProducts(): Promise<Product[]> {
    try {
        const results = await db.select()
            .from(productsTable)
            .where(eq(productsTable.is_active, true))
            .execute();

        return results.map(product => ({
            ...product,
            retail_price: parseFloat(product.retail_price),
            wholesale_price: parseFloat(product.wholesale_price),
            cost_price: parseFloat(product.cost_price)
        }));
    } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error;
    }
}

export async function getProductById(id: number): Promise<Product | null> {
    try {
        const results = await db.select()
            .from(productsTable)
            .where(and(
                eq(productsTable.id, id),
                eq(productsTable.is_active, true)
            ))
            .execute();

        if (results.length === 0) {
            return null;
        }

        const product = results[0];
        return {
            ...product,
            retail_price: parseFloat(product.retail_price),
            wholesale_price: parseFloat(product.wholesale_price),
            cost_price: parseFloat(product.cost_price)
        };
    } catch (error) {
        console.error('Failed to fetch product by ID:', error);
        throw error;
    }
}

export async function updateProduct(id: number, updates: Partial<CreateProductInput>): Promise<Product> {
    try {
        // Check if product exists and is active
        const existingProduct = await getProductById(id);
        if (!existingProduct) {
            throw new Error('Product not found or inactive');
        }

        // Convert numeric fields to strings for database
        const updateValues: any = { ...updates };
        if (updates.retail_price !== undefined) {
            updateValues.retail_price = updates.retail_price.toString();
        }
        if (updates.wholesale_price !== undefined) {
            updateValues.wholesale_price = updates.wholesale_price.toString();
        }
        if (updates.cost_price !== undefined) {
            updateValues.cost_price = updates.cost_price.toString();
        }

        const result = await db.update(productsTable)
            .set({
                ...updateValues,
                updated_at: new Date()
            })
            .where(eq(productsTable.id, id))
            .returning()
            .execute();

        const product = result[0];
        return {
            ...product,
            retail_price: parseFloat(product.retail_price),
            wholesale_price: parseFloat(product.wholesale_price),
            cost_price: parseFloat(product.cost_price)
        };
    } catch (error) {
        console.error('Product update failed:', error);
        throw error;
    }
}

export async function generateProductBarcode(productId: number): Promise<{ barcode: string }> {
    try {
        // Check if product exists
        const product = await getProductById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Generate barcode if one doesn't exist
        if (product.barcode) {
            return { barcode: product.barcode };
        }

        const barcode = `BAR${productId.toString().padStart(8, '0')}`;
        
        await db.update(productsTable)
            .set({
                barcode,
                updated_at: new Date()
            })
            .where(eq(productsTable.id, productId))
            .execute();

        return { barcode };
    } catch (error) {
        console.error('Barcode generation failed:', error);
        throw error;
    }
}

// Warehouse management
export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
    try {
        const result = await db.insert(warehousesTable)
            .values({
                name: input.name,
                address: input.address,
                phone: input.phone,
                email: input.email
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Warehouse creation failed:', error);
        throw error;
    }
}

export async function getWarehouses(): Promise<Warehouse[]> {
    try {
        const results = await db.select()
            .from(warehousesTable)
            .where(eq(warehousesTable.is_active, true))
            .execute();

        return results;
    } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        throw error;
    }
}

// Inventory management
export async function updateInventory(input: UpdateInventoryInput): Promise<Inventory> {
    try {
        // Check if product and warehouse exist
        const product = await getProductById(input.product_id);
        if (!product) {
            throw new Error('Product not found');
        }

        const warehouses = await db.select()
            .from(warehousesTable)
            .where(eq(warehousesTable.id, input.warehouse_id))
            .execute();

        if (warehouses.length === 0) {
            throw new Error('Warehouse not found');
        }

        // Check if inventory record exists
        const existingInventory = await db.select()
            .from(inventoryTable)
            .where(and(
                eq(inventoryTable.product_id, input.product_id),
                eq(inventoryTable.warehouse_id, input.warehouse_id)
            ))
            .execute();

        if (existingInventory.length > 0) {
            // Update existing inventory
            const result = await db.update(inventoryTable)
                .set({
                    quantity: input.quantity,
                    reorder_level: input.reorder_level || existingInventory[0].reorder_level,
                    updated_at: new Date()
                })
                .where(and(
                    eq(inventoryTable.product_id, input.product_id),
                    eq(inventoryTable.warehouse_id, input.warehouse_id)
                ))
                .returning()
                .execute();

            return result[0];
        } else {
            // Create new inventory record
            const result = await db.insert(inventoryTable)
                .values({
                    product_id: input.product_id,
                    warehouse_id: input.warehouse_id,
                    quantity: input.quantity,
                    reorder_level: input.reorder_level || 0
                })
                .returning()
                .execute();

            return result[0];
        }
    } catch (error) {
        console.error('Inventory update failed:', error);
        throw error;
    }
}

export async function getInventoryByWarehouse(warehouseId: number): Promise<Inventory[]> {
    try {
        const results = await db.select()
            .from(inventoryTable)
            .where(eq(inventoryTable.warehouse_id, warehouseId))
            .execute();

        return results;
    } catch (error) {
        console.error('Failed to fetch inventory by warehouse:', error);
        throw error;
    }
}

export async function getLowStockProducts(): Promise<Inventory[]> {
    try {
        const results = await db.select()
            .from(inventoryTable)
            .where(lt(inventoryTable.quantity, inventoryTable.reorder_level))
            .execute();

        return results;
    } catch (error) {
        console.error('Failed to fetch low stock products:', error);
        throw error;
    }
}

export async function getInventoryReport(input: InventoryReportInput): Promise<any> {
    try {
        // Build base query
        const baseQuery = db.select({
            inventory_id: inventoryTable.id,
            product_id: inventoryTable.product_id,
            warehouse_id: inventoryTable.warehouse_id,
            quantity: inventoryTable.quantity,
            reserved_quantity: inventoryTable.reserved_quantity,
            reorder_level: inventoryTable.reorder_level,
            product_name: productsTable.name,
            product_sku: productsTable.sku,
            product_cost_price: productsTable.cost_price,
            warehouse_name: warehousesTable.name
        })
        .from(inventoryTable)
        .innerJoin(productsTable, eq(inventoryTable.product_id, productsTable.id))
        .innerJoin(warehousesTable, eq(inventoryTable.warehouse_id, warehousesTable.id));

        const conditions: SQL<unknown>[] = [];

        if (input.warehouse_id !== undefined) {
            conditions.push(eq(inventoryTable.warehouse_id, input.warehouse_id));
        }

        if (input.low_stock_only === true) {
            conditions.push(lt(inventoryTable.quantity, inventoryTable.reorder_level));
        }

        // Apply conditions if any exist
        const query = conditions.length > 0 
            ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
            : baseQuery;

        const results = await query.execute();

        const totalProducts = results.length;
        const lowStockCount = results.filter(item => item.quantity < item.reorder_level).length;
        const outOfStockCount = results.filter(item => item.quantity === 0).length;
        
        const inventoryValue = results.reduce((total, item) => {
            return total + (item.quantity * parseFloat(item.product_cost_price));
        }, 0);

        const items = results.map(item => ({
            inventory_id: item.inventory_id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            warehouse_id: item.warehouse_id,
            warehouse_name: item.warehouse_name,
            quantity: item.quantity,
            reserved_quantity: item.reserved_quantity,
            reorder_level: item.reorder_level,
            cost_price: parseFloat(item.product_cost_price),
            total_value: item.quantity * parseFloat(item.product_cost_price),
            is_low_stock: item.quantity < item.reorder_level,
            is_out_of_stock: item.quantity === 0
        }));

        return {
            warehouse_id: input.warehouse_id,
            total_products: totalProducts,
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
            inventory_value: inventoryValue,
            items
        };
    } catch (error) {
        console.error('Failed to generate inventory report:', error);
        throw error;
    }
}