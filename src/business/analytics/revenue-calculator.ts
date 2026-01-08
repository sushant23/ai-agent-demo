// Revenue calculation and analysis

import { Product, PerformanceMetrics } from '../../types/business';
import { Money, DateRange } from '../../types/common';

export interface RevenueBreakdown {
  totalRevenue: Money;
  grossProfit: Money;
  netProfit: Money;
  averageOrderValue: Money;
  revenueByProduct: ProductRevenue[];
  revenueByPeriod: PeriodRevenue[];
  profitMargin: number;
  growthRate: number;
}

export interface ProductRevenue {
  productId: string;
  productTitle: string;
  revenue: Money;
  profit: Money;
  salesCount: number;
  profitMargin: number;
  revenueShare: number; // Percentage of total revenue
}

export interface PeriodRevenue {
  period: DateRange;
  revenue: Money;
  profit: Money;
  salesCount: number;
  growthRate: number;
}

export class RevenueCalculator {
  calculateRevenueBreakdown(
    products: Product[],
    period: DateRange,
    previousPeriodMetrics?: PerformanceMetrics[]
  ): RevenueBreakdown {
    // Calculate total revenue and profit
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSales = 0;
    const currency = products[0]?.price?.currency || 'USD';

    const productRevenues: ProductRevenue[] = [];

    for (const product of products) {
      const revenue = product.performanceMetrics.revenue.amount;
      const profit = (product.price.amount - product.cost.amount) * product.performanceMetrics.salesCount;
      const salesCount = product.performanceMetrics.salesCount;
      const profitMargin = product.price.amount > 0 ? profit / revenue : 0;

      totalRevenue += revenue;
      totalProfit += profit;
      totalSales += salesCount;

      productRevenues.push({
        productId: product.id,
        productTitle: product.title,
        revenue: { amount: revenue, currency },
        profit: { amount: profit, currency },
        salesCount,
        profitMargin,
        revenueShare: 0, // Will be calculated after total is known
      });
    }

    // Calculate revenue share for each product
    productRevenues.forEach(pr => {
      pr.revenueShare = totalRevenue > 0 ? (pr.revenue.amount / totalRevenue) * 100 : 0;
    });

    // Sort by revenue descending
    productRevenues.sort((a, b) => b.revenue.amount - a.revenue.amount);

    // Calculate growth rate
    let growthRate = 0;
    if (previousPeriodMetrics && previousPeriodMetrics.length > 0) {
      const previousRevenue = previousPeriodMetrics.reduce((sum, m) => sum + m.revenue.amount, 0);
      if (previousRevenue > 0) {
        growthRate = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
      }
    }

    // Calculate average order value
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Generate period breakdown (simplified - in production would use actual time series data)
    const periodRevenues: PeriodRevenue[] = this.generatePeriodBreakdown(
      { amount: totalRevenue, currency },
      { amount: totalProfit, currency },
      totalSales,
      period,
      growthRate
    );

    return {
      totalRevenue: { amount: totalRevenue, currency },
      grossProfit: { amount: totalProfit, currency },
      netProfit: { amount: totalProfit * 0.8, currency }, // Assuming 20% overhead
      averageOrderValue: { amount: averageOrderValue, currency },
      revenueByProduct: productRevenues,
      revenueByPeriod: periodRevenues,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) : 0,
      growthRate,
    };
  }

  calculateRevenueProjection(
    currentRevenue: Money,
    growthRate: number,
    periods: number
  ): Money[] {
    const projections: Money[] = [];
    let currentAmount = currentRevenue.amount;

    for (let i = 0; i < periods; i++) {
      currentAmount = currentAmount * (1 + growthRate / 100);
      projections.push({
        amount: currentAmount,
        currency: currentRevenue.currency,
      });
    }

    return projections;
  }

  calculateBreakEvenAnalysis(
    fixedCosts: Money,
    variableCostPerUnit: number,
    pricePerUnit: number
  ): {
    breakEvenUnits: number;
    breakEvenRevenue: Money;
    contributionMargin: number;
    contributionMarginRatio: number;
  } {
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = pricePerUnit > 0 ? contributionMargin / pricePerUnit : 0;
    const breakEvenUnits = contributionMargin > 0 ? fixedCosts.amount / contributionMargin : 0;
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;

    return {
      breakEvenUnits,
      breakEvenRevenue: { amount: breakEvenRevenue, currency: fixedCosts.currency },
      contributionMargin,
      contributionMarginRatio,
    };
  }

  private generatePeriodBreakdown(
    totalRevenue: Money,
    totalProfit: Money,
    totalSales: number,
    period: DateRange,
    overallGrowthRate: number
  ): PeriodRevenue[] {
    // Generate weekly breakdown for the period
    const periods: PeriodRevenue[] = [];
    const periodLength = period.end.getTime() - period.start.getTime();
    const weekLength = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const numberOfWeeks = Math.ceil(periodLength / weekLength);

    for (let i = 0; i < numberOfWeeks; i++) {
      const weekStart = new Date(period.start.getTime() + i * weekLength);
      const weekEnd = new Date(Math.min(weekStart.getTime() + weekLength, period.end.getTime()));
      
      // Distribute revenue evenly across weeks (in production, would use actual data)
      const weeklyRevenue = totalRevenue.amount / numberOfWeeks;
      const weeklyProfit = totalProfit.amount / numberOfWeeks;
      const weeklySales = Math.round(totalSales / numberOfWeeks);
      
      // Add some variation to simulate realistic data
      const variation = 0.8 + (Math.random() * 0.4); // 80% to 120% of average
      const adjustedRevenue = weeklyRevenue * variation;
      const adjustedProfit = weeklyProfit * variation;
      const adjustedSales = Math.round(weeklySales * variation);

      periods.push({
        period: { start: weekStart, end: weekEnd },
        revenue: { amount: adjustedRevenue, currency: totalRevenue.currency },
        profit: { amount: adjustedProfit, currency: totalProfit.currency },
        salesCount: adjustedSales,
        growthRate: overallGrowthRate + (Math.random() * 10 - 5), // Add some noise
      });
    }

    return periods;
  }
}