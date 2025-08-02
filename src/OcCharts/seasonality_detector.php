<?php
// File: seasonality_detector.php
// Path: /features/forecasting/seasonality_detector.php
// Version: 1.0.0

/**
 * Fast Seasonality Detection for Time Series
 * Detects if data has seasonal patterns and identifies the period
 */

class SeasonalityDetector {
    
    private $data;
    private $minPoints;
    
    public function __construct(array $data, int $minPoints = 24) {
        $this->data = array_values($data); // Ensure numeric indices
        $this->minPoints = $minPoints;
    }
    
    /**
     * Main detection method - finds seasonality quickly
     */
    public function detect(): array {
        if (count($this->data) < $this->minPoints) {
            return [
                'has_seasonality' => false,
                'reason' => 'Insufficient data points',
                'periods_tested' => [],
                'confidence' => 0
            ];
        }
        
        // Test common seasonal periods
        $candidatePeriods = $this->getCandidatePeriods();
        $results = [];
        
        foreach ($candidatePeriods as $period) {
            $strength = $this->calculateSeasonalStrength($period);
            $results[$period] = $strength;
        }
        
        // Find best period
        $bestPeriod = $this->findBestPeriod($results);
        
        return [
            'has_seasonality' => $bestPeriod['strength'] > 0.3,
            'best_period' => $bestPeriod['period'],
            'strength' => $bestPeriod['strength'],
            'confidence' => $this->calculateConfidence($bestPeriod['strength']),
            'period_name' => $this->getPeriodName($bestPeriod['period']),
            'all_results' => $results,
            'interpretation' => $this->interpretResults($bestPeriod)
        ];
    }
    
    /**
     * Get candidate periods to test based on data length
     */
    private function getCandidatePeriods(): array {
        $n = count($this->data);
        $candidates = [];
        
        // Common business cycles
        $commonPeriods = [
            4 => 'Quarterly',
            6 => 'Semi-annual',
            12 => 'Annual (monthly data)',
            24 => 'Bi-annual',
            52 => 'Annual (weekly data)',
            365 => 'Annual (daily data)'
        ];
        
        foreach ($commonPeriods as $period => $name) {
            // Need at least 2 complete cycles
            if ($period <= $n / 2) {
                $candidates[] = $period;
            }
        }
        
        // Add some additional candidates for edge cases
        if ($n >= 14) $candidates[] = 7;  // Weekly pattern in daily data
        if ($n >= 16) $candidates[] = 8;  // Bi-monthly
        if ($n >= 20) $candidates[] = 10; // Decimal month
        
        return array_unique($candidates);
    }
    
    /**
     * Calculate seasonal strength using autocorrelation
     * Fast method based on correlation at lag = period
     */
    private function calculateSeasonalStrength(int $period): float {
        $n = count($this->data);
        
        if ($period >= $n) {
            return 0.0;
        }
        
        // Method 1: Simple autocorrelation at seasonal lag
        $autocorr = $this->autocorrelation($period);
        
        // Method 2: Variance decomposition (F-test style)
        $seasonalVariance = $this->calculateSeasonalVariance($period);
        $totalVariance = $this->calculateTotalVariance();
        
        $varianceRatio = $totalVariance > 0 ? $seasonalVariance / $totalVariance : 0;
        
        // Method 3: Kruskal-Wallis test strength (non-parametric)
        $kwStrength = $this->kruskalWallisStrength($period);
        
        // Combine all three methods (weighted average)
        $combinedStrength = (
            0.4 * abs($autocorr) +           // Autocorrelation (40%)
            0.4 * $varianceRatio +           // Variance ratio (40%)
            0.2 * $kwStrength                // Non-parametric test (20%)
        );
        
        return min(1.0, $combinedStrength);
    }
    
    /**
     * Fast autocorrelation calculation
     */
    private function autocorrelation(int $lag): float {
        $n = count($this->data);
        $mean = array_sum($this->data) / $n;
        
        $numerator = 0;
        $denominator = 0;
        
        // Calculate autocorrelation
        for ($i = 0; $i < $n - $lag; $i++) {
            $numerator += ($this->data[$i] - $mean) * ($this->data[$i + $lag] - $mean);
        }
        
        for ($i = 0; $i < $n; $i++) {
            $denominator += pow($this->data[$i] - $mean, 2);
        }
        
        return $denominator > 0 ? $numerator / $denominator : 0;
    }
    
    /**
     * Calculate seasonal variance (between-group variance)
     */
    private function calculateSeasonalVariance(int $period): float {
        $n = count($this->data);
        $groups = [];
        
        // Group data by seasonal position
        for ($i = 0; $i < $n; $i++) {
            $seasonPos = $i % $period;
            if (!isset($groups[$seasonPos])) {
                $groups[$seasonPos] = [];
            }
            $groups[$seasonPos][] = $this->data[$i];
        }
        
        // Calculate group means
        $groupMeans = [];
        $overallMean = array_sum($this->data) / $n;
        
        foreach ($groups as $group) {
            $groupMeans[] = array_sum($group) / count($group);
        }
        
        // Calculate between-group variance
        $betweenVariance = 0;
        foreach ($groups as $pos => $group) {
            $betweenVariance += count($group) * pow($groupMeans[$pos] - $overallMean, 2);
        }
        
        return $betweenVariance / ($n - 1);
    }
    
    /**
     * Calculate total variance
     */
    private function calculateTotalVariance(): float {
        $n = count($this->data);
        $mean = array_sum($this->data) / $n;
        
        $variance = 0;
        foreach ($this->data as $value) {
            $variance += pow($value - $mean, 2);
        }
        
        return $variance / ($n - 1);
    }
    
    /**
     * Simplified Kruskal-Wallis test strength
     */
    private function kruskalWallisStrength(int $period): float {
        $n = count($this->data);
        
        // Rank all data points
        $ranked = $this->rankData($this->data);
        
        // Group ranks by seasonal position
        $groups = [];
        for ($i = 0; $i < $n; $i++) {
            $seasonPos = $i % $period;
            if (!isset($groups[$seasonPos])) {
                $groups[$seasonPos] = [];
            }
            $groups[$seasonPos][] = $ranked[$i];
        }
        
        // Calculate rank sums
        $rankSums = [];
        foreach ($groups as $group) {
            $rankSums[] = array_sum($group);
        }
        
        // Simplified H statistic (normalized)
        $expectedRankSum = ($n + 1) / 2;
        $maxDeviation = 0;
        
        foreach ($groups as $group) {
            $avgRank = array_sum($group) / count($group);
            $maxDeviation = max($maxDeviation, abs($avgRank - $expectedRankSum));
        }
        
        // Normalize to [0,1]
        return min(1.0, $maxDeviation / ($n / 2));
    }
    
    /**
     * Rank data (for non-parametric test)
     */
    private function rankData(array $data): array {
        $indexed = [];
        foreach ($data as $i => $value) {
            $indexed[] = ['value' => $value, 'index' => $i];
        }
        
        // Sort by value
        usort($indexed, function($a, $b) {
            return $a['value'] <=> $b['value'];
        });
        
        // Assign ranks
        $ranks = array_fill(0, count($data), 0);
        for ($i = 0; $i < count($indexed); $i++) {
            $ranks[$indexed[$i]['index']] = $i + 1;
        }
        
        return $ranks;
    }
    
    /**
     * Find the best seasonal period from results
     */
    private function findBestPeriod(array $results): array {
        $bestPeriod = 0;
        $bestStrength = 0;
        
        foreach ($results as $period => $strength) {
            if ($strength > $bestStrength) {
                $bestStrength = $strength;
                $bestPeriod = $period;
            }
        }
        
        return ['period' => $bestPeriod, 'strength' => $bestStrength];
    }
    
    /**
     * Calculate confidence level
     */
    private function calculateConfidence(float $strength): string {
        if ($strength >= 0.7) return 'High';
        if ($strength >= 0.5) return 'Moderate';
        if ($strength >= 0.3) return 'Low';
        return 'Very Low';
    }
    
    /**
     * Get human-readable period name
     */
    private function getPeriodName(int $period): string {
        $names = [
            4 => 'Quarterly (4-period cycle)',
            6 => 'Semi-annual (6-period cycle)',
            7 => 'Weekly (7-period cycle)',
            12 => 'Annual/Yearly (12-period cycle)',
            24 => 'Bi-annual (24-period cycle)',
            52 => 'Annual weekly (52-period cycle)',
            365 => 'Annual daily (365-period cycle)'
        ];
        
        return $names[$period] ?? "{$period}-period cycle";
    }
    
    /**
     * Interpret results for business users
     */
    private function interpretResults(array $bestPeriod): string {
        $period = $bestPeriod['period'];
        $strength = $bestPeriod['strength'];
        
        if ($strength < 0.3) {
            return "No significant seasonal pattern detected. Data appears to be mostly random or trending.";
        }
        
        $confidence = $this->calculateConfidence($strength);
        $periodName = $this->getPeriodName($period);
        
        $interpretation = "Seasonal pattern detected with {$confidence} confidence. ";
        $interpretation .= "Pattern repeats every {$period} periods ({$periodName}). ";
        
        if ($period == 12) {
            $interpretation .= "This suggests yearly seasonality in monthly data - common for business sales with annual cycles.";
        } elseif ($period == 4) {
            $interpretation .= "This suggests quarterly seasonality - possibly seasonal business patterns.";
        } elseif ($period == 6) {
            $interpretation .= "This suggests semi-annual seasonality - possibly bi-yearly business cycles.";
        } elseif ($period == 52) {
            $interpretation .= "This suggests yearly seasonality in weekly data.";
        } else {
            $interpretation .= "This is a custom seasonal cycle.";
        }
        
        return $interpretation;
    }
    
    /**
     * Quick detection method - just returns yes/no and period
     */
    public function quickDetect(): array {
        $result = $this->detect();
        
        return [
            'seasonal' => $result['has_seasonality'],
            'period' => $result['has_seasonality'] ? $result['best_period'] : null,
            'type' => $result['has_seasonality'] ? $result['period_name'] : 'No seasonality'
        ];
    }
}

// Usage Examples and Testing

/**
 * Example 1: Monthly sales data with yearly seasonality
 */
function testMonthlySalesData() {
    // Simulated monthly sales with yearly pattern (higher in Q4)
    $monthlySales = [];
    for ($year = 0; $year < 3; $year++) {
        for ($month = 1; $month <= 12; $month++) {
            $base = 1000;
            $seasonal = $month >= 10 ? 500 : 0; // Q4 boost
            $noise = rand(-100, 100);
            $monthlySales[] = $base + $seasonal + $noise;
        }
    }
    
    $detector = new SeasonalityDetector($monthlySales);
    return $detector->detect();
}

/**
 * Example 2: Quarterly data
 */
function testQuarterlyData() {
    // Simulated quarterly data with seasonal pattern
    $quarterlyData = [
        800, 900, 1100, 1300,  // Year 1: Q1, Q2, Q3, Q4
        850, 950, 1150, 1350,  // Year 2
        900, 1000, 1200, 1400, // Year 3
        950, 1050, 1250, 1450  // Year 4
    ];
    
    $detector = new SeasonalityDetector($quarterlyData);
    return $detector->quickDetect();
}

/**
 * Example 3: Random data (no seasonality)
 */
function testRandomData() {
    $randomData = [];
    for ($i = 0; $i < 36; $i++) {
        $randomData[] = rand(800, 1200);
    }
    
    $detector = new SeasonalityDetector($randomData);
    return $detector->quickDetect();
}

// Test the examples
/*
echo "=== Monthly Sales Test ===\n";
$monthlyResult = testMonthlySalesData();
print_r($monthlyResult);

echo "\n=== Quarterly Data Test ===\n";  
$quarterlyResult = testQuarterlyData();
print_r($quarterlyResult);

echo "\n=== Random Data Test ===\n";
$randomResult = testRandomData();
print_r($randomResult);
*/

?>