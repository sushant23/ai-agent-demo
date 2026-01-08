// Data aggregation service for combining data from multiple sources

import {
  IDataAggregator,
  DataConflict,
  Resolution,
} from '../interfaces/business-data-service';
import {
  Product,
  PerformanceMetrics,
} from '../types/business';

export class DataAggregator implements IDataAggregator {
  async aggregateProducts(sources: Product[][]): Promise<Product[]> {
    const productMap = new Map<string, Product>();
    const conflicts: DataConflict[] = [];

    // Flatten all products from all sources
    for (const sourceProducts of sources) {
      for (const product of sourceProducts) {
        const existingProduct = productMap.get(product.id);
        
        if (!existingProduct) {
          // First time seeing this product
          productMap.set(product.id, { ...product });
        } else {
          // Product exists, need to merge or detect conflicts
          const mergedProduct = await this.mergeProducts(existingProduct, product);
          productMap.set(product.id, mergedProduct);
        }
      }
    }

    return Array.from(productMap.values());
  }

  async aggregateMetrics(sources: PerformanceMetrics[]): Promise<PerformanceMetrics> {
    if (sources.length === 0) {
      throw new Error('No metrics sources provided');
    }

    if (sources.length === 1) {
      const firstSource = sources[0];
      if (!firstSource) {
        throw new Error('Invalid metrics source');
      }
      return firstSource;
    }

    // Aggregate metrics by summing/averaging appropriate fields
    const firstSource = sources[0];
    if (!firstSource) {
      throw new Error('Invalid first metrics source');
    }

    const aggregated: PerformanceMetrics = {
      revenue: { amount: 0, currency: firstSource.revenue.currency },
      salesCount: 0,
      conversionRate: 0,
      impressions: 0,
      clicks: 0,
      profitMargin: 0,
      period: firstSource.period, // Use first source's period
      trends: [],
    };

    let totalRevenue = 0;
    let totalSales = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalProfitMargin = 0;

    for (const metrics of sources) {
      totalRevenue += metrics.revenue.amount;
      totalSales += metrics.salesCount;
      totalImpressions += metrics.impressions;
      totalClicks += metrics.clicks;
      totalProfitMargin += metrics.profitMargin;
    }

    aggregated.revenue.amount = totalRevenue;
    aggregated.salesCount = totalSales;
    aggregated.impressions = totalImpressions;
    aggregated.clicks = totalClicks;
    aggregated.profitMargin = totalProfitMargin / sources.length; // Average
    aggregated.conversionRate = totalClicks > 0 ? totalSales / totalClicks : 0;

    // Merge trends (simplified - in production would be more sophisticated)
    const trendMap = new Map<string, { direction: string; changes: number[] }>();
    
    for (const metrics of sources) {
      for (const trend of metrics.trends) {
        const existing = trendMap.get(trend.metric);
        if (existing) {
          existing.changes.push(trend.changePercent);
        } else {
          trendMap.set(trend.metric, {
            direction: trend.direction,
            changes: [trend.changePercent],
          });
        }
      }
    }

    // Calculate average trends
    for (const [metric, data] of Array.from(trendMap.entries())) {
      const avgChange = data.changes.reduce((sum, change) => sum + change, 0) / data.changes.length;
      let direction: 'up' | 'down' | 'stable' = 'stable';
      
      if (avgChange > 5) direction = 'up';
      else if (avgChange < -5) direction = 'down';

      aggregated.trends.push({
        metric,
        direction,
        changePercent: avgChange,
        period: aggregated.period,
      });
    }

    return aggregated;
  }

  async resolveConflicts(conflicts: DataConflict[]): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];

    for (const conflict of conflicts) {
      let resolution: Resolution;

      switch (conflict.field) {
        case 'price':
        case 'cost':
          // For monetary values, use the highest confidence source
          resolution = this.resolveByHighestConfidence(conflict);
          break;
          
        case 'title':
        case 'description':
          // For text fields, use the longest/most detailed version
          resolution = this.resolveByLength(conflict);
          break;
          
        case 'inventory':
          // For inventory, use the most recent/latest value
          resolution = this.resolveByLatest(conflict);
          break;
          
        case 'seoScore':
          // For scores, use the average
          resolution = this.resolveByAverage(conflict);
          break;
          
        default:
          // Default to highest confidence
          resolution = this.resolveByHighestConfidence(conflict);
      }

      resolutions.push(resolution);
    }

    return resolutions;
  }

  private async mergeProducts(existing: Product, incoming: Product): Promise<Product> {
    // Simple merge strategy - in production this would be more sophisticated
    const merged = { ...existing };

    // Update with more recent data (assuming incoming is more recent)
    if (incoming.price) merged.price = incoming.price;
    if (incoming.inventory) merged.inventory = incoming.inventory;
    if (incoming.performanceMetrics) merged.performanceMetrics = incoming.performanceMetrics;

    // Merge tags (union)
    const allTags = new Set([...existing.tags, ...incoming.tags]);
    merged.tags = Array.from(allTags);

    // Use higher SEO score
    if (incoming.seoScore > existing.seoScore) {
      merged.seoScore = incoming.seoScore;
    }

    return merged;
  }

  private resolveByHighestConfidence(conflict: DataConflict): Resolution {
    const maxConfidenceIndex = conflict.confidence.indexOf(Math.max(...conflict.confidence));
    const confidence = conflict.confidence[maxConfidenceIndex];
    
    return {
      field: conflict.field,
      resolvedValue: conflict.values[maxConfidenceIndex],
      strategy: 'highest_confidence',
      confidence: confidence ?? 0,
    };
  }

  private resolveByLength(conflict: DataConflict): Resolution {
    let longestIndex = 0;
    let maxLength = 0;

    conflict.values.forEach((value, index) => {
      const length = typeof value === 'string' ? value.length : 0;
      if (length > maxLength) {
        maxLength = length;
        longestIndex = index;
      }
    });

    const confidence = conflict.confidence[longestIndex];

    return {
      field: conflict.field,
      resolvedValue: conflict.values[longestIndex],
      strategy: 'manual', // This would be 'longest' in a real implementation
      confidence: confidence ?? 0,
    };
  }

  private resolveByLatest(conflict: DataConflict): Resolution {
    // Assume the last value is the most recent
    const latestIndex = conflict.values.length - 1;
    const confidence = conflict.confidence[latestIndex];
    
    return {
      field: conflict.field,
      resolvedValue: conflict.values[latestIndex],
      strategy: 'latest',
      confidence: confidence ?? 0,
    };
  }

  private resolveByAverage(conflict: DataConflict): Resolution {
    const numericValues = conflict.values.filter(v => typeof v === 'number') as number[];
    
    if (numericValues.length === 0) {
      return this.resolveByHighestConfidence(conflict);
    }

    const average = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
    const avgConfidence = conflict.confidence.reduce((sum, conf) => sum + conf, 0) / conflict.confidence.length;

    return {
      field: conflict.field,
      resolvedValue: average,
      strategy: 'merge',
      confidence: avgConfidence,
    };
  }
}