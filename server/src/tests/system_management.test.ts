import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, customersTable, warehousesTable } from '../db/schema';
import {
  backupDatabase,
  restoreDatabase,
  exportData,
  importData,
  updateSystemSettings,
  getSystemSettings,
  updateBranding,
  getSystemHealth,
  getActivityLogs,
  configureModulePermissions,
  getModulePermissions
} from '../handlers/system_management';

describe('System Management Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('backupDatabase', () => {
    it('should create a backup successfully', async () => {
      const result = await backupDatabase();
      
      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
    });

    it('should work with existing data', async () => {
      // Create some test data
      await db.insert(usersTable).values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'User'
      });

      const result = await backupDatabase();
      
      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/^backup_/);
    });
  });

  describe('restoreDatabase', () => {
    it('should restore from valid backup ID', async () => {
      const backupId = 'backup_2024-01-01T12-00-00-000Z';
      const result = await restoreDatabase(backupId);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid backup ID format', async () => {
      await expect(restoreDatabase('invalid-backup-id')).rejects.toThrow(/Invalid backup ID format/i);
    });

    it('should reject empty backup ID', async () => {
      await expect(restoreDatabase('')).rejects.toThrow(/Invalid backup ID format/i);
    });
  });

  describe('exportData', () => {
    beforeEach(async () => {
      // Create test data for export
      await db.insert(usersTable).values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'User'
      });

      await db.insert(productsTable).values({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        retail_price: '19.99',
        wholesale_price: '15.99',
        cost_price: '10.00',
        barcode: '123456789'
      });

      await db.insert(customersTable).values({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '123-456-7890',
        customer_type: 'RETAIL'
      });
    });

    it('should export users in CSV format', async () => {
      const result = await exportData('users', 'CSV');
      
      expect(result.downloadUrl).toMatch(/^\/exports\/users_\d+\.csv$/);
    });

    it('should export products in JSON format', async () => {
      const result = await exportData('products', 'JSON');
      
      expect(result.downloadUrl).toMatch(/^\/exports\/products_\d+\.json$/);
    });

    it('should export customers in EXCEL format', async () => {
      const result = await exportData('customers', 'EXCEL');
      
      expect(result.downloadUrl).toMatch(/^\/exports\/customers_\d+\.excel$/);
    });

    it('should reject invalid data type', async () => {
      await expect(exportData('invalid-type', 'CSV')).rejects.toThrow(/Invalid data type/i);
    });

    it('should reject invalid format', async () => {
      await expect(exportData('users', 'PDF' as any)).rejects.toThrow(/Invalid format/i);
    });
  });

  describe('importData', () => {
    it('should import users data successfully', async () => {
      const result = await importData('users', '/uploads/users_import.csv');
      
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(typeof result.recordsProcessed).toBe('number');
    });

    it('should import products data successfully', async () => {
      const result = await importData('products', '/uploads/products_import.json');
      
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
    });

    it('should reject invalid data type', async () => {
      await expect(importData('invalid-type', '/uploads/test.csv')).rejects.toThrow(/Invalid data type/i);
    });

    it('should reject invalid file URL', async () => {
      await expect(importData('users', 'invalid-url')).rejects.toThrow(/Invalid file URL format/i);
    });
  });

  describe('updateSystemSettings', () => {
    it('should update valid system settings', async () => {
      const settings = {
        company_name: 'Updated Company',
        default_tax_rate: 0.10,
        currency: 'EUR'
      };

      const result = await updateSystemSettings(settings);
      
      expect(result.success).toBe(true);
    });

    it('should update single setting', async () => {
      const result = await updateSystemSettings({ default_commission_rate: 0.03 });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid setting keys', async () => {
      const settings = { invalid_setting: 'value' };
      
      await expect(updateSystemSettings(settings)).rejects.toThrow(/Invalid setting keys/i);
    });

    it('should validate tax rate range', async () => {
      await expect(updateSystemSettings({ default_tax_rate: 1.5 })).rejects.toThrow(/default_tax_rate must be a number between 0 and 1/i);
      await expect(updateSystemSettings({ default_tax_rate: -0.1 })).rejects.toThrow(/default_tax_rate must be a number between 0 and 1/i);
    });

    it('should validate commission rate range', async () => {
      await expect(updateSystemSettings({ default_commission_rate: 2.0 })).rejects.toThrow(/default_commission_rate must be a number between 0 and 1/i);
    });

    it('should validate low stock threshold', async () => {
      await expect(updateSystemSettings({ low_stock_threshold: -5 })).rejects.toThrow(/low_stock_threshold must be a positive number/i);
    });
  });

  describe('getSystemSettings', () => {
    it('should return system settings', async () => {
      const settings = await getSystemSettings();
      
      expect(settings).toBeDefined();
      expect(typeof settings['company_name']).toBe('string');
      expect(typeof settings['default_tax_rate']).toBe('number');
      expect(typeof settings['default_commission_rate']).toBe('number');
      expect(typeof settings['currency']).toBe('string');
      expect(typeof settings['low_stock_threshold']).toBe('number');
    });

    it('should return updated settings after update', async () => {
      await updateSystemSettings({ company_name: 'New Company Name' });
      
      const settings = await getSystemSettings();
      
      expect(settings['company_name']).toBe('New Company Name');
    });
  });

  describe('updateBranding', () => {
    it('should update branding with valid data', async () => {
      const branding = {
        companyName: 'New Brand',
        colors: { primary: '#ff0000', secondary: '#00ff00' },
        logo: 'https://example.com/logo.png'
      };

      const result = await updateBranding(branding);
      
      expect(result.success).toBe(true);
    });

    it('should update partial branding data', async () => {
      const result = await updateBranding({ companyName: 'Partial Update' });
      
      expect(result.success).toBe(true);
    });

    it('should validate company name type', async () => {
      await expect(updateBranding({ companyName: 123 as any })).rejects.toThrow(/companyName must be a string/i);
    });

    it('should validate colors type', async () => {
      await expect(updateBranding({ colors: 'invalid' as any })).rejects.toThrow(/colors must be an object/i);
    });

    it('should validate logo type', async () => {
      await expect(updateBranding({ logo: 123 as any })).rejects.toThrow(/logo must be a string/i);
    });
  });

  describe('getSystemHealth', () => {
    beforeEach(async () => {
      // Create test data to get meaningful health stats
      await db.insert(usersTable).values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'CASHIER',
        first_name: 'Test',
        last_name: 'User'
      });

      await db.insert(productsTable).values({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        retail_price: '19.99',
        wholesale_price: '15.99',
        cost_price: '10.00'
      });
    });

    it('should return system health metrics', async () => {
      const health = await getSystemHealth();
      
      expect(health.database_status).toBe('healthy');
      expect(typeof health.server_uptime).toBe('string');
      expect(typeof health.memory_usage).toBe('string');
      expect(typeof health.disk_usage).toBe('string');
      expect(typeof health.total_users).toBe('number');
      expect(typeof health.total_products).toBe('number');
      expect(typeof health.total_transactions).toBe('number');
      expect(typeof health.active_users).toBe('number');
      expect(Array.isArray(health.recent_errors)).toBe(true);
    });

    it('should show correct counts', async () => {
      const health = await getSystemHealth();
      
      expect(health.total_users).toBeGreaterThan(0);
      expect(health.total_products).toBeGreaterThan(0);
    });
  });

  describe('getActivityLogs', () => {
    it('should return activity logs with default limit', async () => {
      const logs = await getActivityLogs();
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should return activity logs with custom limit', async () => {
      const logs = await getActivityLogs(50);
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeLessThanOrEqual(50);
    });

    it('should validate limit range', async () => {
      await expect(getActivityLogs(0)).rejects.toThrow(/Limit must be between 1 and 1000/i);
      await expect(getActivityLogs(1001)).rejects.toThrow(/Limit must be between 1 and 1000/i);
    });
  });

  describe('configureModulePermissions', () => {
    it('should configure permissions for valid role', async () => {
      const permissions = {
        sales: true,
        inventory_view: true,
        reports: false
      };

      const result = await configureModulePermissions('CASHIER', permissions);
      
      expect(result.success).toBe(true);
    });

    it('should update existing permissions', async () => {
      // First set some permissions
      await configureModulePermissions('CASHIER', { sales: true });
      
      // Then update them
      const result = await configureModulePermissions('CASHIER', { inventory_view: true });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', async () => {
      await expect(configureModulePermissions('INVALID_ROLE', { sales: true })).rejects.toThrow(/Invalid role/i);
    });

    it('should reject invalid permission keys', async () => {
      const permissions = { invalid_permission: true };
      
      await expect(configureModulePermissions('CASHIER', permissions)).rejects.toThrow(/Invalid permission keys/i);
    });

    it('should validate permission values as boolean', async () => {
      const permissions = { sales: 'true' as any };
      
      await expect(configureModulePermissions('CASHIER', permissions)).rejects.toThrow(/Permission sales must be a boolean value/i);
    });
  });

  describe('getModulePermissions', () => {
    it('should return permissions for valid role', async () => {
      const permissions = await getModulePermissions('ADMINISTRATOR');
      
      expect(typeof permissions).toBe('object');
      expect(typeof permissions['sales']).toBe('boolean');
      expect(typeof permissions['admin']).toBe('boolean');
    });

    it('should return updated permissions after configuration', async () => {
      await configureModulePermissions('CASHIER', { sales: false, inventory_view: true });
      
      const permissions = await getModulePermissions('CASHIER');
      
      expect(permissions['sales']).toBe(false);
      expect(permissions['inventory_view']).toBe(true);
    });

    it('should reject invalid role', async () => {
      await expect(getModulePermissions('INVALID_ROLE')).rejects.toThrow(/Invalid role/i);
    });

    it('should return default permissions for known roles', async () => {
      const superAdminPermissions = await getModulePermissions('SUPER_ADMIN');
      
      expect(superAdminPermissions['system_management']).toBe(true);
      expect(superAdminPermissions['admin']).toBe(true);
    });
  });
});