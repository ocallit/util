asdf


// Auto-detect seasonality first
$detector = new SeasonalityDetector($salesData);
$seasonality = $detector->quickDetect();

if ($seasonality['seasonal']) {
// Use detected period
$forecaster = new ThetaHoltWintersForecaster($salesData, $seasonality['period']);
} else {
// Use simple trend-only forecasting
$forecaster = new SimpleTrendForecaster($salesData);
}

$forecasts = $forecaster->forecast(6);

// The system automatically chooses:
if ($hasOutliers || $highVolatility) {
return 'robust';        // Handle messy data
} elseif ($strongTrend) {
return 'linear';        // Simple linear projection
} elseif ($limitedData) {
return 'exponential';   // Adaptive method
} else {
return 'damped';        // Conservative default
}

// Your complete forecasting system
$detector = new SeasonalityDetector($salesData);
$seasonality = $detector->quickDetect();

if ($seasonality['seasonal']) {
// Use seasonal forecasting
$forecaster = new ThetaHoltWintersForecaster($salesData, $seasonality['period']);
$method = "Seasonal ({$seasonality['period']}-period)";
} else {
// Use trend-only forecasting
$forecaster = new SimpleTrendForecaster($salesData, 'auto');
$method = "Trend-only";
}

$result = $forecaster->forecast(6);
echo "Using {$method} forecasting method\n";

// The system automatically chooses:
if ($hasOutliers || $highVolatility) {
return 'robust';        // Handle messy data
} elseif ($strongTrend) {
return 'linear';        // Simple linear projection
} elseif ($limitedData) {
return 'exponential';   // Adaptive method
} else {
return 'damped';        // Conservative default
}

private function selectBestMethod(): string {
$trendStrength = $this->calculateTrendStrength();
$volatility = $this->calculateVolatility();
$hasSpikes = $this->detectSpikes(); // New method

    // Prioritize realistic methods
    if ($hasSpikes || $volatility > 0.4) {
        return 'robust';      // Handle spikes/promotions
    }
    
    if ($trendStrength > 0.8 && $volatility < 0.2) {
        return 'damped';      // Strong but realistic trend
    }
    
    return 'exponential';     // Default: adaptive to changes
    
    // Linear only for very specific cases
    if ($this->isVeryShortTerm() && $this->isStableProduct()) {
        return 'linear';
    }
}


About Kalman Filter (Professional Grade) and
Regime-Switching Models (Academic)

. Structural Break Detection (Chow Test)
// Detect when parameters fundamentally changed
$breakPoint = $this->chowTest($data, $suspectedBreakDate);
if ($breakPoint) {
$preBreakData = array_slice($data, 0, $breakPoint);
$postBreakData = array_slice($data, $breakPoint);
// Forecast using only post-break data
}

. Intervention Analysis (ARIMA-X)
// Model the intervention directly
// Y(t) = trend + seasonal + intervention + noise
// Where intervention = step function or pulse function

3. Level Shift Detection


// Markov Regime Switching - 2 states example
class RegimeSwitchingForecaster {
private $states = ['normal', 'crisis'];
private $transitionMatrix = [
'normal' => ['normal' => 0.95, 'crisis' => 0.05],
'crisis' => ['normal' => 0.3, 'crisis' => 0.7]
];

    public function forecast($steps) {
        // EM algorithm for parameter estimation
        // Viterbi algorithm for state sequence
        // More complex but manageable in PHP
    }
}
// Enhanced breaking event detection
$detector = new BreakingEventDetector($salesData);
$events = $detector->detectEvents([
'pandemic_patterns' => true,    // Sudden drops + slow recovery
'supply_shocks' => true,        // Temporary spikes
'policy_changes' => true,       // Step changes
'market_crashes' => true        // Sustained declines
]);
