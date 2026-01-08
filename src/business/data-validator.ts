// Data validation service for business data

import {
  IDataValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../interfaces/business-data-service';
import {
  Product,
  PerformanceMetrics,
  BusinessProfile,
} from '../types/business';

export class DataValidator implements IDataValidator {
  validateProduct(product: Product): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!product.id || product.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Product ID is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    if (!product.title || product.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Product title is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    if (!product.sku || product.sku.trim() === '') {
      errors.push({
        field: 'sku',
        message: 'Product SKU is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Price validation
    if (!product.price || product.price.amount <= 0) {
      errors.push({
        field: 'price',
        message: 'Product price must be greater than 0',
        code: 'INVALID_PRICE',
        severity: 'error',
      });
    }

    if (!product.cost || product.cost.amount < 0) {
      errors.push({
        field: 'cost',
        message: 'Product cost cannot be negative',
        code: 'INVALID_COST',
        severity: 'error',
      });
    }

    // Profit margin validation
    if (product.price && product.cost && product.cost.amount >= product.price.amount) {
      warnings.push({
        field: 'cost',
        message: 'Product cost is equal to or higher than price, resulting in no profit',
        suggestion: 'Consider adjusting price or cost to ensure profitability',
      });
    }

    // SEO score validation
    if (product.seoScore < 0 || product.seoScore > 100) {
      errors.push({
        field: 'seoScore',
        message: 'SEO score must be between 0 and 100',
        code: 'INVALID_RANGE',
        severity: 'error',
      });
    }

    if (product.seoScore < 50) {
      warnings.push({
        field: 'seoScore',
        message: 'SEO score is below 50, which may impact visibility',
        suggestion: 'Consider optimizing product title, description, and tags for better SEO',
      });
    }

    // Inventory validation
    if (product.inventory) {
      if (product.inventory.quantity < 0) {
        errors.push({
          field: 'inventory.quantity',
          message: 'Inventory quantity cannot be negative',
          code: 'INVALID_QUANTITY',
          severity: 'error',
        });
      }

      if (product.inventory.available < 0) {
        errors.push({
          field: 'inventory.available',
          message: 'Available inventory cannot be negative',
          code: 'INVALID_QUANTITY',
          severity: 'error',
        });
      }

      if (product.inventory.available > product.inventory.quantity) {
        errors.push({
          field: 'inventory.available',
          message: 'Available inventory cannot exceed total quantity',
          code: 'INVALID_INVENTORY',
          severity: 'error',
        });
      }

      if (product.inventory.available <= product.inventory.lowStockThreshold) {
        warnings.push({
          field: 'inventory.available',
          message: 'Product is at or below low stock threshold',
          suggestion: 'Consider restocking this product',
        });
      }
    }

    // Tags validation
    if (!product.tags || product.tags.length === 0) {
      warnings.push({
        field: 'tags',
        message: 'Product has no tags',
        suggestion: 'Adding relevant tags can improve discoverability',
      });
    }

    // Description validation
    if (!product.description || product.description.trim().length < 10) {
      warnings.push({
        field: 'description',
        message: 'Product description is too short',
        suggestion: 'A detailed description can improve conversion rates',
      });
    }

    // Images validation
    if (!product.images || product.images.length === 0) {
      warnings.push({
        field: 'images',
        message: 'Product has no images',
        suggestion: 'Adding product images is essential for sales',
      });
    } else {
      const hasPrimaryImage = product.images.some(img => img.isPrimary);
      if (!hasPrimaryImage) {
        warnings.push({
          field: 'images',
          message: 'No primary image set',
          suggestion: 'Set one image as primary for better display',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateMetrics(metrics: PerformanceMetrics): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Revenue validation
    if (!metrics.revenue || metrics.revenue.amount < 0) {
      errors.push({
        field: 'revenue',
        message: 'Revenue cannot be negative',
        code: 'INVALID_REVENUE',
        severity: 'error',
      });
    }

    // Sales count validation
    if (metrics.salesCount < 0) {
      errors.push({
        field: 'salesCount',
        message: 'Sales count cannot be negative',
        code: 'INVALID_COUNT',
        severity: 'error',
      });
    }

    // Conversion rate validation
    if (metrics.conversionRate < 0 || metrics.conversionRate > 1) {
      errors.push({
        field: 'conversionRate',
        message: 'Conversion rate must be between 0 and 1',
        code: 'INVALID_RATE',
        severity: 'error',
      });
    }

    if (metrics.conversionRate < 0.01) {
      warnings.push({
        field: 'conversionRate',
        message: 'Conversion rate is very low (below 1%)',
        suggestion: 'Consider optimizing product listing or pricing',
      });
    }

    // Impressions and clicks validation
    if (metrics.impressions < 0) {
      errors.push({
        field: 'impressions',
        message: 'Impressions cannot be negative',
        code: 'INVALID_COUNT',
        severity: 'error',
      });
    }

    if (metrics.clicks < 0) {
      errors.push({
        field: 'clicks',
        message: 'Clicks cannot be negative',
        code: 'INVALID_COUNT',
        severity: 'error',
      });
    }

    if (metrics.clicks > metrics.impressions) {
      errors.push({
        field: 'clicks',
        message: 'Clicks cannot exceed impressions',
        code: 'INVALID_METRICS',
        severity: 'error',
      });
    }

    // Profit margin validation
    if (metrics.profitMargin < 0 || metrics.profitMargin > 1) {
      errors.push({
        field: 'profitMargin',
        message: 'Profit margin must be between 0 and 1',
        code: 'INVALID_MARGIN',
        severity: 'error',
      });
    }

    if (metrics.profitMargin < 0.1) {
      warnings.push({
        field: 'profitMargin',
        message: 'Profit margin is below 10%',
        suggestion: 'Consider reviewing pricing or cost structure',
      });
    }

    // Period validation
    if (!metrics.period || !metrics.period.start || !metrics.period.end) {
      errors.push({
        field: 'period',
        message: 'Metrics period is required with start and end dates',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (metrics.period.start >= metrics.period.end) {
      errors.push({
        field: 'period',
        message: 'Period start date must be before end date',
        code: 'INVALID_PERIOD',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateBusinessProfile(profile: BusinessProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!profile.userId || profile.userId.trim() === '') {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    if (!profile.businessName || profile.businessName.trim() === '') {
      errors.push({
        field: 'businessName',
        message: 'Business name is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Email validation
    if (!profile.primaryEmail || profile.primaryEmail.trim() === '') {
      errors.push({
        field: 'primaryEmail',
        message: 'Primary email is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (!this.isValidEmail(profile.primaryEmail)) {
      errors.push({
        field: 'primaryEmail',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        severity: 'error',
      });
    }

    // Marketplace validation
    if (!profile.connectedMarketplaces || profile.connectedMarketplaces.length === 0) {
      warnings.push({
        field: 'connectedMarketplaces',
        message: 'No marketplaces connected',
        suggestion: 'Connect at least one marketplace to start selling',
      });
    }

    // Subscription plan validation
    if (!profile.subscriptionPlan) {
      errors.push({
        field: 'subscriptionPlan',
        message: 'Subscription plan is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  sanitizeData<T>(data: T): T {
    if (typeof data === 'string') {
      // Basic string sanitization
      return data.trim().replace(/[<>]/g, '') as unknown as T;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item)) as unknown as T;
    }

    if (data && typeof data === 'object') {
      const sanitized = { ...data };
      for (const key in sanitized) {
        if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}