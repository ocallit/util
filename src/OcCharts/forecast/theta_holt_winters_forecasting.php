<?php
// File: theta_holt_winters_forecasting.php
// Path: /features/forecasting/theta_holt_winters_forecasting.php
// Version: 1.0.0

/**
 * Advanced Forecasting with Theta Method + Holt-Winters Hybrid
 * Using L-BFGS-B optimization for fast parameter estimation
 */

class ThetaHoltWintersForecaster {
    
    private $data;
    private $seasonalPeriod;
    private $alpha, $beta, $gamma; // HW parameters
    private $theta; // Theta parameter
    
    public function __construct(array $data, int $seasonalPeriod = 12) {
        $this->data = $data;
        $this->seasonalPeriod = $seasonalPeriod;
    }
    
    /**
     * Main forecasting method combining Theta + Holt-Winters
     */
    public function forecast(int $steps = 6): array {
        if (count($this->data) < $this->seasonalPeriod * 2) {
            throw new Exception("Need at least " . ($this->seasonalPeriod * 2) . " data points for seasonal forecasting");
        }
        
        // Step 1: Theta Method for trend estimation and initial parameters
        $thetaResults = $this->thetaMethod();
        
        // Step 2: Use Theta results to initialize Holt-Winters parameters
        $initialParams = $this->getInitialParameters($thetaResults);
        
        // Step 3: L-BFGS-B optimization for parameter refinement
        $optimizedParams = $this->optimizeParameters($initialParams);
        
        // Step 4: Generate forecasts using optimized Holt-Winters
        $forecasts = $this->holtWintersForcast($optimizedParams, $steps);
        
        return [
            'forecasts' => $forecasts,
            'parameters' => $optimizedParams,
            'theta_trend' => $thetaResults['trend'],
            'seasonality' => $this->extractSeasonality(),
            'method' => 'Theta-HoltWinters-LBFGSB'
        ];
    }
    
    /**
     * Theta Method Implementation
     * Fast trend estimation and seasonality decomposition
     */
    private function thetaMethod(): array {
        $n = count($this->data);
        
        // Theta decomposition with theta = 2 (standard)
        $theta = 2.0;
        
        // Seasonal decomposition using moving averages
        $seasonal = $this->extractSeasonality();
        $deseasonalized = $this->deseasonalize($this->data, $seasonal);
        
        // Linear trend on deseasonalized data
        $trend = $this->calculateLinearTrend($deseasonalized);
        
        // Theta lines
        $thetaLine = [];
        for ($i = 0; $i < $n; $i++) {
            $thetaLine[] = $deseasonalized[$i] + ($theta - 1) * ($deseasonalized[$i] - $trend['intercept'] - $trend['slope'] * $i);
        }
        
        return [
            'trend' => $trend,
            'seasonal' => $seasonal,
            'theta_line' => $thetaLine,
            'deseasonalized' => $deseasonalized,
            'theta' => $theta
        ];
    }
    
    /**
     * Extract seasonal pattern using X-11 style decomposition
     */
    private function extractSeasonality(): array {
        $n = count($this->data);
        $seasonal = array_fill(0, $this->seasonalPeriod, 0);
        $counts = array_fill(0, $this->seasonalPeriod, 0);
        
        // Calculate centered moving average
        $centered = $this->centeredMovingAverage();
        
        // Calculate seasonal indices
        for ($i = $this->seasonalPeriod; $i < $n - $this->seasonalPeriod; $i++) {
            if ($centered[$i] != 0) {
                $seasonIndex = $i % $this->seasonalPeriod;
                $seasonal[$seasonIndex] += $this->data[$i] / $centered[$i];
                $counts[$seasonIndex]++;
            }
        }
        
        // Average and normalize
        for ($i = 0; $i < $this->seasonalPeriod; $i++) {
            if ($counts[$i] > 0) {
                $seasonal[$i] /= $counts[$i];
            } else {
                $seasonal[$i] = 1.0;
            }
        }
        
        // Normalize so sum = seasonalPeriod
        $sum = array_sum($seasonal);
        if ($sum > 0) {
            for ($i = 0; $i < $this->seasonalPeriod; $i++) {
                $seasonal[$i] = $seasonal[$i] * $this->seasonalPeriod / $sum;
            }
        }
        
        return $seasonal;
    }
    
    /**
     * Centered moving average for trend extraction
     */
    private function centeredMovingAverage(): array {
        $n = count($this->data);
        $centered = array_fill(0, $n, 0);
        $halfPeriod = intval($this->seasonalPeriod / 2);
        
        for ($i = $halfPeriod; $i < $n - $halfPeriod; $i++) {
            $sum = 0;
            for ($j = $i - $halfPeriod; $j <= $i + $halfPeriod; $j++) {
                $sum += $this->data[$j];
            }
            $centered[$i] = $sum / $this->seasonalPeriod;
        }
        
        return $centered;
    }
    
    /**
     * Deseasonalize data
     */
    private function deseasonalize(array $data, array $seasonal): array {
        $deseasonalized = [];
        $n = count($data);
        
        for ($i = 0; $i < $n; $i++) {
            $seasonIndex = $i % $this->seasonalPeriod;
            $deseasonalized[] = $seasonal[$seasonIndex] != 0 ? $data[$i] / $seasonal[$seasonIndex] : $data[$i];
        }
        
        return $deseasonalized;
    }
    
    /**
     * Calculate linear trend using least squares
     */
    private function calculateLinearTrend(array $data): array {
        $n = count($data);
        $sumX = $sumY = $sumXY = $sumX2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sumX += $i;
            $sumY += $data[$i];
            $sumXY += $i * $data[$i];
            $sumX2 += $i * $i;
        }
        
        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;
        
        return ['slope' => $slope, 'intercept' => $intercept];
    }
    
    /**
     * Initialize Holt-Winters parameters using Theta method results
     */
    private function getInitialParameters(array $thetaResults): array {
        // Smart initialization based on Theta method results
        $trendStrength = abs($thetaResults['trend']['slope']);
        $seasonalStrength = $this->calculateSeasonalStrength($thetaResults['seasonal']);
        
        // Adaptive parameter initialization
        $alpha = min(0.9, max(0.1, 0.3 + $trendStrength * 0.4)); // Level smoothing
        $beta = min(0.9, max(0.0, $trendStrength * 0.5));        // Trend smoothing  
        $gamma = min(0.9, max(0.0, $seasonalStrength * 0.6));    // Seasonal smoothing
        
        return ['alpha' => $alpha, 'beta' => $beta, 'gamma' => $gamma];
    }
    
    /**
     * Calculate seasonal strength (coefficient of variation)
     */
    private function calculateSeasonalStrength(array $seasonal): float {
        $mean = array_sum($seasonal) / count($seasonal);
        $variance = 0;
        
        foreach ($seasonal as $value) {
            $variance += pow($value - $mean, 2);
        }
        
        $stdDev = sqrt($variance / count($seasonal));
        return $mean != 0 ? $stdDev / abs($mean) : 0;
    }
    
    /**
     * L-BFGS-B Optimization for parameter estimation
     * Simplified implementation of the L-BFGS-B algorithm
     */
    private function optimizeParameters(array $initialParams): array {
        $bestParams = $initialParams;
        $bestSSE = $this->calculateSSE($initialParams);
        
        // L-BFGS-B simplified implementation
        $iterations = 50;
        $learningRate = 0.01;
        $history = [];
        
        for ($iter = 0; $iter < $iterations; $iter++) {
            // Calculate gradient numerically (for simplicity)
            $gradient = $this->calculateGradient($bestParams);
            
            // L-BFGS direction calculation (simplified)
            $direction = $this->calculateLBFGSDirection($gradient, $history);
            
            // Line search with bounds
            $newParams = $this->lineSearchWithBounds($bestParams, $direction, $learningRate);
            
            // Evaluate new parameters
            $newSSE = $this->calculateSSE($newParams);
            
            if ($newSSE < $bestSSE) {
                // Update history for L-BFGS
                $history[] = [
                    'params' => $bestParams,
                    'gradient' => $gradient
                ];
                
                // Keep only last 10 iterations for memory efficiency
                if (count($history) > 10) {
                    array_shift($history);
                }
                
                $bestParams = $newParams;
                $bestSSE = $newSSE;
            } else {
                // Reduce learning rate if no improvement
                $learningRate *= 0.8;
            }
            
            // Early stopping if gradient is small
            if ($this->vectorNorm($gradient) < 1e-6) {
                break;
            }
        }
        
        return $bestParams;
    }
    
    /**
     * Calculate gradient numerically (finite differences)
     */
    private function calculateGradient(array $params): array {
        $epsilon = 1e-6;
        $gradient = [];
        $baseSSE = $this->calculateSSE($params);
        
        foreach (['alpha', 'beta', 'gamma'] as $param) {
            $paramsPlus = $params;
            $paramsPlus[$param] += $epsilon;
            $sseePlus = $this->calculateSSE($paramsPlus);
            
            $gradient[$param] = ($sseePlus - $baseSSE) / $epsilon;
        }
        
        return $gradient;
    }
    
    /**
     * Simplified L-BFGS direction calculation
     */
    private function calculateLBFGSDirection(array $gradient, array $history): array {
        if (empty($history)) {
            // First iteration: use steepest descent
            return array_map(function($g) { return -$g; }, $gradient);
        }
        
        // Simplified L-BFGS two-loop recursion
        $q = $gradient;
        $alphas = [];
        
        // First loop
        for ($i = count($history) - 1; $i >= 0; $i--) {
            $hist = $history[$i];
            $s = $this->vectorSubtract($params ?? [], $hist['params']);
            $y = $this->vectorSubtract($gradient, $hist['gradient']);
            
            $rho = 1.0 / $this->vectorDot($s, $y);
            $alpha = $rho * $this->vectorDot($s, $q);
            $alphas[$i] = $alpha;
            
            $q = $this->vectorSubtract($q, $this->vectorScale($y, $alpha));
        }
        
        // Scale q (simplified)
        $r = $this->vectorScale($q, -1.0);
        
        // Second loop
        for ($i = 0; $i < count($history); $i++) {
            $hist = $history[$i];
            $s = $this->vectorSubtract($params ?? [], $hist['params']);
            $y = $this->vectorSubtract($gradient, $hist['gradient']);
            
            $rho = 1.0 / $this->vectorDot($s, $y);
            $beta = $rho * $this->vectorDot($y, $r);
            
            $r = $this->vectorAdd($r, $this->vectorScale($s, $alphas[$i] - $beta));
        }
        
        return $r;
    }
    
    /**
     * Line search with parameter bounds
     */
    private function lineSearchWithBounds(array $params, array $direction, float $learningRate): array {
        $newParams = [];
        
        foreach (['alpha', 'beta', 'gamma'] as $param) {
            $newValue = $params[$param] + $learningRate * $direction[$param];
            
            // Apply bounds [0.0, 1.0]
            $newParams[$param] = max(0.0, min(1.0, $newValue));
        }
        
        return $newParams;
    }
    
    /**
     * Calculate Sum of Squared Errors for parameter optimization
     */
    private function calculateSSE(array $params): float {
        try {
            $predictions = $this->holtWintersBacktest($params);
            $sse = 0;
            $n = count($this->data);
            
            for ($i = $this->seasonalPeriod; $i < $n; $i++) {
                $error = $this->data[$i] - $predictions[$i];
                $sse += $error * $error;
            }
            
            return $sse;
        } catch (Exception $e) {
            return PHP_FLOAT_MAX; // Penalty for invalid parameters
        }
    }
    
    /**
     * Holt-Winters backtest for parameter optimization
     */
    private function holtWintersBacktest(array $params): array {
        $alpha = $params['alpha'];
        $beta = $params['beta'];
        $gamma = $params['gamma'];
        
        $n = count($this->data);
        $seasonal = $this->extractSeasonality();
        
        // Initialize level, trend, and seasonal components
        $level = array_sum(array_slice($this->data, 0, $this->seasonalPeriod)) / $this->seasonalPeriod;
        $trend = 0;
        
        $predictions = array_fill(0, $n, 0);
        
        for ($t = 0; $t < $n; $t++) {
            $seasonIndex = $t % $this->seasonalPeriod;
            
            if ($t == 0) {
                $predictions[$t] = $level * $seasonal[$seasonIndex];
            } else {
                $predictions[$t] = ($level + $trend) * $seasonal[$seasonIndex];
                
                // Update components
                $newLevel = $alpha * ($this->data[$t] / $seasonal[$seasonIndex]) + (1 - $alpha) * ($level + $trend);
                $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $trend;
                $seasonal[$seasonIndex] = $gamma * ($this->data[$t] / $newLevel) + (1 - $gamma) * $seasonal[$seasonIndex];
                
                $level = $newLevel;
                $trend = $newTrend;
            }
        }
        
        return $predictions;
    }
    
    /**
     * Generate forecasts using optimized Holt-Winters
     */
    private function holtWintersForcast(array $params, int $steps): array {
        $alpha = $params['alpha'];
        $beta = $params['beta'];
        $gamma = $params['gamma'];
        
        $n = count($this->data);
        $seasonal = $this->extractSeasonality();
        
        // Initialize with recent data
        $level = $this->data[$n - 1];
        $trend = 0;
        
        // Calculate initial trend from last few points
        if ($n >= 2) {
            $trend = ($this->data[$n - 1] - $this->data[$n - 2]);
        }
        
        // Fit model to existing data to get final level, trend, seasonal
        for ($t = max(0, $n - $this->seasonalPeriod); $t < $n; $t++) {
            $seasonIndex = $t % $this->seasonalPeriod;
            
            if ($t > 0) {
                $newLevel = $alpha * ($this->data[$t] / $seasonal[$seasonIndex]) + (1 - $alpha) * ($level + $trend);
                $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $trend;
                $seasonal[$seasonIndex] = $gamma * ($this->data[$t] / $newLevel) + (1 - $gamma) * $seasonal[$seasonIndex];
                
                $level = $newLevel;
                $trend = $newTrend;
            }
        }
        
        // Generate forecasts
        $forecasts = [];
        for ($h = 1; $h <= $steps; $h++) {
            $seasonIndex = ($n + $h - 1) % $this->seasonalPeriod;
            $forecast = ($level + $h * $trend) * $seasonal[$seasonIndex];
            $forecasts[] = max(0, $forecast); // Ensure non-negative forecasts
        }
        
        return $forecasts;
    }
    
    // Vector operations for L-BFGS-B
    private function vectorDot(array $a, array $b): float {
        $dot = 0;
        foreach ($a as $key => $value) {
            $dot += $value * ($b[$key] ?? 0);
        }
        return $dot;
    }
    
    private function vectorAdd(array $a, array $b): array {
        $result = [];
        foreach ($a as $key => $value) {
            $result[$key] = $value + ($b[$key] ?? 0);
        }
        return $result;
    }
    
    private function vectorSubtract(array $a, array $b): array {
        $result = [];
        foreach ($a as $key => $value) {
            $result[$key] = $value - ($b[$key] ?? 0);
        }
        return $result;
    }
    
    private function vectorScale(array $vector, float $scalar): array {
        $result = [];
        foreach ($vector as $key => $value) {
            $result[$key] = $value * $scalar;
        }
        return $result;
    }
    
    private function vectorNorm(array $vector): float {
        return sqrt($this->vectorDot($vector, $vector));
    }
}

// Usage Example
/*
// Sample monthly sales data (24 months)
$salesData = [
    1500, 1600, 1800, 2100, 2300, 2500, // Jan-Jun Year 1
    2800, 3200, 2900, 2400, 1900, 1700, // Jul-Dec Year 1
    1600, 1750, 1950, 2250, 2450, 2700, // Jan-Jun Year 2
    3000, 3400, 3100, 2600, 2100, 1900  // Jul-Dec Year 2
];

try {
    $forecaster = new ThetaHoltWintersForecaster($salesData, 12); // 12-month seasonality
    $result = $forecaster->forecast(6); // Forecast 6 months ahead
    
    echo "Forecasts for next 6 months:\n";
    foreach ($result['forecasts'] as $i => $forecast) {
        echo "Month " . ($i + 1) . ": " . round($forecast, 0) . "\n";
    }
    
    echo "\nOptimized Parameters:\n";
    echo "Alpha (level): " . round($result['parameters']['alpha'], 3) . "\n";
    echo "Beta (trend): " . round($result['parameters']['beta'], 3) . "\n";
    echo "Gamma (seasonal): " . round($result['parameters']['gamma'], 3) . "\n";
    echo "Method: " . $result['method'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
*/

?>