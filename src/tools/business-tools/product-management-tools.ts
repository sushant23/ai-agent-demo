import {
  BusinessTool,
  ToolCategory,
  ToolParameters,
  ToolResult,
  JSONSchema,
} from '../../types/tools';
import {
  Product,
  ProductFilters,
  BusinessDataService,
} from '../../types/business';

// Product List Tool
export const createProductListTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'product-list',
  name: 'List Products',
  description: 'Retrieve a list of products with optional filtering and sorting',
  version: '1.0.0',
  category: ToolCategory.PRODUCT_MANAGEMENT,
  inputSchema: {
    type: 'object',
    properties: {
      marketplace: {
        type: 'string',
        description: 'Filter by marketplace ID',
      },
      category: {
        type: 'string',
        description: 'Filter by product category',
      },
      priceRange: {
        type: 'object',
        properties: {
          min: { type: 'number', minimum: 0 },
          max: { type: 'number', minimum: 0 },
        },
        description: 'Filter by price range',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by product tags',
      },
      lowStock: {
        type: 'boolean',
        description: 'Filter for low stock products only',
      },
      sortBy: {
        type: 'string',
        enum: ['revenue', 'profit', 'sales', 'seo_score'],
        description: 'Sort products by metric',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of products to return',
      },
      offset: {
        type: 'number',
        minimum: 0,
        description: 'Number of products to skip',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: { type: 'object' },
      },
      total: { type: 'number' },
      hasMore: { type: 'boolean' },
    },
    required: ['products', 'total', 'hasMore'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const filters: ProductFilters = {
        marketplace: parameters.marketplace as string,
        category: parameters.category as string,
        priceRange: parameters.priceRange as { min: number; max: number },
        tags: parameters.tags as string[],
        lowStock: parameters.lowStock as boolean,
        sortBy: parameters.sortBy as 'revenue' | 'profit' | 'sales' | 'seo_score',
        sortOrder: parameters.sortOrder as 'asc' | 'desc',
        limit: parameters.limit as number || 20,
        offset: parameters.offset as number || 0,
      };

      const products = await dataService.getProducts(filters);
      const total = products.length; // In a real implementation, this would be a separate count query
      const hasMore = filters.limit ? products.length === filters.limit : false;

      return {
        success: true,
        data: {
          products,
          total,
          hasMore,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_LIST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve products',
        },
      };
    }
  },
});

// Product Search Tool
export const createProductSearchTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'product-search',
  name: 'Search Products',
  description: 'Search products by title, description, or SKU',
  version: '1.0.0',
  category: ToolCategory.PRODUCT_MANAGEMENT,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for product title, description, or SKU',
      },
      marketplace: {
        type: 'string',
        description: 'Filter by marketplace ID',
      },
      category: {
        type: 'string',
        description: 'Filter by product category',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of results to return',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: { type: 'object' },
      },
      total: { type: 'number' },
    },
    required: ['products', 'total'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const query = parameters.query as string;
      const marketplace = parameters.marketplace as string;
      const category = parameters.category as string;
      const limit = (parameters.limit as number) || 20;

      // Get all products and filter by search query
      const filters: ProductFilters = {
        marketplace,
        category,
        limit,
      };

      const allProducts = await dataService.getProducts(filters);
      
      // Simple text search implementation
      const searchTerms = query.toLowerCase().split(' ');
      const matchingProducts = allProducts.filter(product => {
        const searchableText = [
          product.title,
          product.description,
          product.sku,
          ...product.tags,
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });

      return {
        success: true,
        data: {
          products: matchingProducts,
          total: matchingProducts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to search products',
        },
      };
    }
  },
});

// Product Detail Tool
export const createProductDetailTool = (dataService: BusinessDataService): BusinessTool => ({
  id: 'product-detail',
  name: 'Get Product Details',
  description: 'Retrieve detailed information for a specific product',
  version: '1.0.0',
  category: ToolCategory.PRODUCT_MANAGEMENT,
  inputSchema: {
    type: 'object',
    properties: {
      productId: {
        type: 'string',
        description: 'Product ID to retrieve details for',
      },
    },
    required: ['productId'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      product: { type: 'object' },
    },
    required: ['product'],
  },
  execute: async (parameters: ToolParameters): Promise<ToolResult> => {
    try {
      const productId = parameters.productId as string;
      const product = await dataService.getProduct(productId);

      if (!product) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product with ID ${productId} not found`,
          },
        };
      }

      return {
        success: true,
        data: {
          product,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_DETAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve product details',
        },
      };
    }
  },
});