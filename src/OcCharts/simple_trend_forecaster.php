<?php
// File: simple_trend_forecaster.php
// Path: /features/forecasting/simple_trend_forecaster.php
// Version: 1.0.0

/**
 * Simple Trend Forecaster for Non-Seasonal Data
 * Multiple methods: Linear Regression, Exponential Smoothing, and Robust Trend
 */

class SimpleTrendForecaster {
    
    private $data;
    private $method;
    
    public function __construct(array $data, string $method = 'auto') {
        $this->data = array_values($data);
        $this->method = $method;
    }
    
    /**
     * Main forecasting method
     */
    public function forecast(int $steps = 6): array {
        if (count($this->data) < 3) {
            throw new Exception("Need at least 3 data points for trend forecasting");
        }
        
        // Auto-select best method if not specified
        if ($this->method === 'auto') {
            $this->method = $this->selectBestMethod();
        }
        
        switch ($this->method) {
            case 'linear':
                return $this->linearRegressionForecast($steps);
            case 'exponential':
                return $this->exponentialSmoothingForecast($steps);
            case 'robust':
                return $this->robustTrendForecast($steps);
            case 'damped':
                return $this->dampedTrendForecast($steps);
            default:
                return $this->exponentialSmoothingForecast($steps);
        }
    }
    
    /**
     * Auto-select best method based on data characteristics
     * 1. Recent trend change (≤3 periods)? → adaptive_window
     * 2. Moderate trend change (≤6 periods)? → exponential
     * 3. Outliers OR high volatility? → robust
     * 4. Strong linear trend? → linear
     * 5. Limited data (<12 points)? → exponential
     * 6. Default → damped
     */
    private function selectBestMethod(): string {
        $n = count($this->data);

        // Calculate ALL characteristics
        $trendStrength = $this->calculateTrendStrength();
        $volatility = $this->calculateVolatility();
        $hasOutliers = $this->detectOutliers();
        $changePoint = $this->detectTrendChangePoint(); // NEW addition

        // NEW: Check for recent trend changes FIRST
        if ($changePoint !== null) {
            $periodsAgoChanged = $n - $changePoint;

            if ($periodsAgoChanged <= 3) {
                return 'adaptive_window';  // Very recent change - use data since change
            } elseif ($periodsAgoChanged <= 6) {
                return 'exponential';     // Recent change - high adaptation
            }
            // If change was >6 periods ago, continue with original logic
        }

        // ORIGINAL LOGIC (preserved)
        if ($hasOutliers || $volatility > 0.3) {
            return 'robust';  // Handle outliers and high volatility
        }

        if ($trendStrength > 0.7) {
            return 'linear';  // Strong linear trend
        }

        if ($n < 12) {
            return 'exponential';  // Limited data, use adaptive method
        }

        return 'damped';  // Default: damped trend (prevents over-extrapolation)
    }
    private function selectBestMethodOLD(): string {
        $n = count($this->data);
        
        // Calculate trend strength and volatility
        $trendStrength = $this->calculateTrendStrength();
        $volatility = $this->calculateVolatility();
        $hasOutliers = $this->detectOutliers();
        
        // Decision tree for method selection
        if ($hasOutliers || $volatility > 0.3) {
            return 'robust';  // Handle outliers and high volatility
        }
        
        if ($trendStrength > 0.7) {
            return 'linear';  // Strong linear trend
        }
        
        if ($n < 12) {
            return 'exponential';  // Limited data, use adaptive method
        }
        
        return 'damped';  // Default: damped trend (prevents over-extrapolation)
    }
    
    /**
     * Method 1: Linear Regression Forecast
     * Best for: Strong, consistent linear trends
     */
    private function linearRegressionForecast(int $steps): array {
        $n = count($this->data);
        
        // Calculate linear regression parameters
        $sumX = $sumY = $sumXY = $sumX2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sumX += $i;
            $sumY += $this->data[$i];
            $sumXY += $i * $this->data[$i];
            $sumX2 += $i * $i;
        }
        
        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;
        
        // Generate forecasts
        $forecasts = [];
        for ($h = 1; $h <= $steps; $h++) {
            $forecast = $intercept + $slope * ($n + $h - 1);
            $forecasts[] = max(0, $forecast); // Ensure non-negative
        }
        
        return [
            'forecasts' => $forecasts,
            'method' => 'Linear Regression',
            'parameters' => ['slope' => $slope, 'intercept' => $intercept],
            'trend_strength' => $this->calculateTrendStrength()
        ];
    }
    
    /**
     * Method 2: Double Exponential Smoothing (Holt's Method)
     * Best for: Adaptive trending, handles changes in trend
     */
    private function exponentialSmoothingForecast(int $steps): array {
        // Optimize alpha and beta parameters
        $optimized = $this->optimizeHoltParameters();
        $alpha = $optimized['alpha'];
        $beta = $optimized['beta'];
        
        $n = count($this->data);
        
        // Initialize level and trend
        $level = $this->data[0];
        $trend = $n > 1 ? $this->data[1] - $this->data[0] : 0;
        
        // Fit the model to existing data
        for ($t = 1; $t < $n; $t++) {
            $newLevel = $alpha * $this->data[$t] + (1 - $alpha) * ($level + $trend);
            $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $trend;
            
            $level = $newLevel;
            $trend = $newTrend;
        }
        
        // Generate forecasts
        $forecasts = [];
        for ($h = 1; $h <= $steps; $h++) {
            $forecast = $level + $h * $trend;
            $forecasts[] = max(0, $forecast);
        }
        
        return [
            'forecasts' => $forecasts,
            'method' => 'Double Exponential Smoothing (Holt)',
            'parameters' => ['alpha' => $alpha, 'beta' => $beta],
            'final_level' => $level,
            'final_trend' => $trend
        ];
    }
    
    /**
     * Method 3: Robust Trend Forecast
     * Best for: Data with outliers, irregular patterns
     */
    private function robustTrendForecast(int $steps): array {
        // Use median-based regression (Theil-Sen estimator)
        $slopes = [];
        $n = count($this->data);
        
        // Calculate all possible slopes between pairs of points
        for ($i = 0; $i < $n - 1; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                if ($j != $i) {
                    $slope = ($this->data[$j] - $this->data[$i]) / ($j - $i);
                    $slopes[] = $slope;
                }
            }
        }
        
        // Use median slope (robust to outliers)
        sort($slopes);
        $medianSlope = $slopes[intval(count($slopes) / 2)];
        
        // Calculate robust intercept using median
        $intercepts = [];
        for ($i = 0; $i < $n; $i++) {
            $intercepts[] = $this->data[$i] - $medianSlope * $i;
        }
        sort($intercepts);
        $medianIntercept = $intercepts[intval(count($intercepts) / 2)];
        
        // Generate forecasts
        $forecasts = [];
        for ($h = 1; $h <= $steps; $h++) {
            $forecast = $medianIntercept + $medianSlope * ($n + $h - 1);
            $forecasts[] = max(0, $forecast);
        }
        
        return [
            'forecasts' => $forecasts,
            'method' => 'Robust Trend (Theil-Sen)',
            'parameters' => ['slope' => $medianSlope, 'intercept' => $medianIntercept],
            'outliers_detected' => $this->detectOutliers()
        ];
    }
    
    /**
     * Method 4: Damped Trend Forecast
     * Best for: Prevents over-extrapolation, conservative forecasts
     */
    private function dampedTrendForecast(int $steps): array {
        // Optimize parameters including damping factor
        $optimized = $this->optimizeDampedParameters();
        $alpha = $optimized['alpha'];
        $beta = $optimized['beta'];
        $phi = $optimized['phi']; // Damping parameter (0 < phi < 1)
        
        $n = count($this->data);
        
        // Initialize
        $level = $this->data[0];
        $trend = $n > 1 ? $this->data[1] - $this->data[0] : 0;
        
        // Fit model
        for ($t = 1; $t < $n; $t++) {
            $newLevel = $alpha * $this->data[$t] + (1 - $alpha) * ($level + $phi * $trend);
            $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $phi * $trend;
            
            $level = $newLevel;
            $trend = $newTrend;
        }
        
        // Generate damped forecasts
        $forecasts = [];
        $dampedTrend = $trend;
        
        for ($h = 1; $h <= $steps; $h++) {
            $forecast = $level + $dampedTrend * array_sum(array_map(function($i) use ($phi) {
                return pow($phi, $i);
            }, range(1, $h)));
            
            $forecasts[] = max(0, $forecast);
        }
        
        return [
            'forecasts' => $forecasts,
            'method' => 'Damped Trend',
            'parameters' => ['alpha' => $alpha, 'beta' => $beta, 'phi' => $phi],
            'final_level' => $level,
            'final_trend' => $trend
        ];
    }
    
    /**
     * Optimize Holt's method parameters
     */
    private function optimizeHoltParameters(): array {
        $bestSSE = PHP_FLOAT_MAX;
        $bestAlpha = 0.3;
        $bestBeta = 0.1;
        
        // Grid search (fast for 2 parameters)
        for ($alpha = 0.1; $alpha <= 0.9; $alpha += 0.1) {
            for ($beta = 0.0; $beta <= 0.3; $beta += 0.05) {
                $sse = $this->calculateHoltSSE($alpha, $beta);
                if ($sse < $bestSSE) {
                    $bestSSE = $sse;
                    $bestAlpha = $alpha;
                    $bestBeta = $beta;
                }
            }
        }
        
        return ['alpha' => $bestAlpha, 'beta' => $bestBeta];
    }
    
    /**
     * Optimize damped trend parameters
     */
    private function optimizeDampedParameters(): array {
        $bestSSE = PHP_FLOAT_MAX;
        $bestParams = ['alpha' => 0.3, 'beta' => 0.1, 'phi' => 0.9];
        
        // Coarser grid search for 3 parameters
        for ($alpha = 0.2; $alpha <= 0.8; $alpha += 0.2) {
            for ($beta = 0.0; $beta <= 0.2; $beta += 0.1) {
                for ($phi = 0.8; $phi <= 0.98; $phi += 0.06) {
                    $sse = $this->calculateDampedSSE($alpha, $beta, $phi);
                    if ($sse < $bestSSE) {
                        $bestSSE = $sse;
                        $bestParams = ['alpha' => $alpha, 'beta' => $beta, 'phi' => $phi];
                    }
                }
            }
        }
        
        return $bestParams;
    }
    
    /**
     * Calculate SSE for Holt's method
     */
    private function calculateHoltSSE(float $alpha, float $beta): float {
        $n = count($this->data);
        $level = $this->data[0];
        $trend = $n > 1 ? $this->data[1] - $this->data[0] : 0;
        $sse = 0;
        
        for ($t = 1; $t < $n; $t++) {
            $forecast = $level + $trend;
            $error = $this->data[$t] - $forecast;
            $sse += $error * $error;
            
            $newLevel = $alpha * $this->data[$t] + (1 - $alpha) * ($level + $trend);
            $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $trend;
            
            $level = $newLevel;
            $trend = $newTrend;
        }
        
        return $sse;
    }
    
    /**
     * Calculate SSE for damped trend
     */
    private function calculateDampedSSE(float $alpha, float $beta, float $phi): float {
        $n = count($this->data);
        $level = $this->data[0];
        $trend = $n > 1 ? $this->data[1] - $this->data[0] : 0;
        $sse = 0;
        
        for ($t = 1; $t < $n; $t++) {
            $forecast = $level + $phi * $trend;
            $error = $this->data[$t] - $forecast;
            $sse += $error * $error;
            
            $newLevel = $alpha * $this->data[$t] + (1 - $alpha) * ($level + $phi * $trend);
            $newTrend = $beta * ($newLevel - $level) + (1 - $beta) * $phi * $trend;
            
            $level = $newLevel;
            $trend = $newTrend;
        }
        
        return $sse;
    }
    
    /**
     * Calculate trend strength
     */
    private function calculateTrendStrength(): float {
        $n = count($this->data);
        if ($n < 3) return 0;
        
        // Simple linear correlation with time
        $meanY = array_sum($this->data) / $n;
        $meanX = ($n - 1) / 2;
        
        $numerator = $denominator = 0;
        for ($i = 0; $i < $n; $i++) {
            $numerator += ($i - $meanX) * ($this->data[$i] - $meanY);
            $denominator += pow($i - $meanX, 2);
        }
        
        return $denominator > 0 ? abs($numerator / sqrt($denominator * array_sum(array_map(function($y) use ($meanY) {
            return pow($y - $meanY, 2);
        }, $this->data)))) : 0;
    }
    
    /**
     * Calculate volatility (coefficient of variation)
     */
    private function calculateVolatility(): float {
        $mean = array_sum($this->data) / count($this->data);
        $variance = array_sum(array_map(function($x) use ($mean) {
            return pow($x - $mean, 2);
        }, $this->data)) / count($this->data);
        
        return $mean > 0 ? sqrt($variance) / $mean : 0;
    }
    
    /**
     * Detect outliers using IQR method
     */
    private function detectOutliers(): bool {
        $sorted = $this->data;
        sort($sorted);
        $n = count($sorted);
        
        $q1 = $sorted[intval($n * 0.25)];
        $q3 = $sorted[intval($n * 0.75)];
        $iqr = $q3 - $q1;
        
        $lowerBound = $q1 - 1.5 * $iqr;
        $upperBound = $q3 + 1.5 * $iqr;
        
        foreach ($this->data as $value) {
            if ($value < $lowerBound || $value > $upperBound) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Method 5: Adaptive Window Exponential (CORRECTED)
     */
    private function adaptiveWindowForecast(int $steps): array {
        // Step 1: Find when trend actually changed
        $changePoint = $this->detectTrendChangePoint();

        if ($changePoint !== null) {
            // Use data ONLY since the trend change
            $dataSize = count($this->data);
            $windowSize = $dataSize - $changePoint;
            $recentData = array_slice($this->data, $changePoint);

            echo "Trend changed {$windowSize} periods ago, using {$windowSize} data points\n";
        } else {
            // No recent trend change detected - use larger window
            $windowSize = min(24, count($this->data)); // Full seasonal cycle or all data
            $recentData = array_slice($this->data, -$windowSize);

            echo "No trend change detected, using {$windowSize} data points\n";
        }

        // Apply exponential smoothing to the relevant data
        return $this->applyHoltsMethodToWindow($recentData, $steps);
    }

    /**
     * Detect exactly WHERE the trend changed
     */
    private function detectTrendChangePoint(): ?int {
        $n = count($this->data);
        if ($n < 8) return null;

        $significantChangeThreshold = 0.3;
        $minWindowSize = 4;

        // Test each potential change point (recent first)
        for ($testPoint = $n - $minWindowSize; $testPoint >= $minWindowSize; $testPoint--) {
            $beforeChange = array_slice($this->data, max(0, $testPoint - 6), 6);
            $afterChange = array_slice($this->data, $testPoint);

            if (count($afterChange) < $minWindowSize) continue;

            $trendBefore = $this->calculateTrendSlope($beforeChange);
            $trendAfter = $this->calculateTrendSlope($afterChange);

            $changeSignificance = abs($trendAfter - $trendBefore);

            if ($changeSignificance > $significantChangeThreshold) {
                // Found significant change point
                return $testPoint;
            }
        }

        return null; // No significant trend change found
    }
}

// Usage Examples

/*
// Example 1: Linear growth data
$linearData = [100, 110, 120, 135, 145, 160, 175, 185, 200, 215];
$forecaster = new SimpleTrendForecaster($linearData, 'auto');
$result = $forecaster->forecast(6);
echo "Linear trend forecast:\n";
print_r($result);

// Example 2: Volatile data
$volatileData = [100, 150, 80, 120, 200, 90, 160, 110, 180, 140];
$forecaster2 = new SimpleTrendForecaster($volatileData, 'auto');
$result2 = $forecaster2->forecast(6);
echo "\nVolatile data forecast:\n";
print_r($result2);

// Example 3: Comparing methods
$testData = [50, 55, 62, 58, 65, 70, 75, 78, 85, 90, 95, 100];
$methods = ['linear', 'exponential', 'robust', 'damped'];

foreach ($methods as $method) {
    $forecaster = new SimpleTrendForecaster($testData, $method);
    $result = $forecaster->forecast(3);
    echo "\n{$method} method: " . implode(', ', array_map('round', $result['forecasts'])) . "\n";
}
*/

?>