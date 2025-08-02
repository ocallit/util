<?php
// File: kalman_filter_forecaster.php
// Path: /features/forecasting/kalman_filter_forecaster.php
// Version: 1.0.0

/**
 * Kalman Filter Forecaster for Breaking Events and Regime Changes
 * Handles structural breaks, pandemic-like disruptions, and regime switching
 */

class KalmanFilterForecaster {
    
    private $data;
    private $state;           // [level, trend, seasonal_component]
    private $stateCovariance; // Uncertainty matrix
    private $processNoise;    // How much the model can change
    private $observationNoise; // Measurement uncertainty
    
    public function __construct(array $data, array $options = []) {
        $this->data = array_values($data);
        
        // Kalman Filter matrices setup
        $this->initializeMatrices($options);
        $this->initializeState();
    }
    
    /**
     * Main forecasting with breaking event detection
     */
    public function forecast(int $steps = 6, array $knownEvents = []): array {
        if (count($this->data) < 3) {
            throw new Exception("Need at least 3 data points for Kalman filtering");
        }
        
        // Step 1: Run Kalman filter through historical data
        $filteredStates = $this->runKalmanFilter();
        
        // Step 2: Detect structural breaks automatically
        $breakingEvents = $this->detectBreakingEvents($filteredStates);
        
        // Step 3: Handle known future events (e.g., planned policy changes)
        $allEvents = array_merge($breakingEvents, $knownEvents);
        
        // Step 4: Generate adaptive forecasts
        $forecasts = $this->generateAdaptiveForecasts($steps, $allEvents);
        
        return [
            'forecasts' => $forecasts,
            'detected_breaks' => $breakingEvents,
            'innovation_variance' => $this->calculateInnovationVariance($filteredStates),
            'confidence_intervals' => $this->calculateConfidenceIntervals($forecasts),
            'method' => 'Kalman Filter with Break Detection'
        ];
    }
    
    /**
     * Initialize Kalman Filter matrices
     */
    private function initializeMatrices(array $options): void {
        // State transition matrix (how state evolves)
        $this->F = [
            [1, 1, 0],  // level(t) = level(t-1) + trend(t-1)
            [0, 1, 0],  // trend(t) = trend(t-1)
            [0, 0, 1]   // seasonal(t) = seasonal(t-1)
        ];
        
        // Observation matrix (how we observe the state)
        $this->H = [1, 1, 1]; // observation = level + trend + seasonal
        
        // Process noise covariance (how much can the system change)
        $processVar = $options['process_variance'] ?? 0.1;
        $this->Q = [
            [$processVar, 0, 0],
            [0, $processVar * 0.1, 0],  // Trend changes less
            [0, 0, $processVar * 0.5]   // Seasonal moderate change
        ];
        
        // Observation noise (measurement uncertainty)
        $this->R = $options['observation_variance'] ?? 1.0;
        
        // Initial state covariance (initial uncertainty)
        $initialVar = $options['initial_variance'] ?? 10.0;
        $this->P = [
            [$initialVar, 0, 0],
            [0, $initialVar, 0],
            [0, 0, $initialVar]
        ];
    }
    
    /**
     * Initialize state vector with reasonable starting values
     */
    private function initializeState(): void {
        $n = count($this->data);
        
        // Initial level: average of first few points
        $initialLevel = array_sum(array_slice($this->data, 0, min(3, $n))) / min(3, $n);
        
        // Initial trend: simple slope from first few points
        $initialTrend = 0;
        if ($n >= 2) {
            $initialTrend = $this->data[1] - $this->data[0];
        }
        
        // Initial seasonal: start at 0
        $initialSeasonal = 0;
        
        $this->state = [$initialLevel, $initialTrend, $initialSeasonal];
    }
    
    /**
     * Run Kalman filter through all historical data
     */
    private function runKalmanFilter(): array {
        $states = [];
        $innovations = [];
        $n = count($this->data);
        
        for ($t = 0; $t < $n; $t++) {
            // Prediction step
            $predictedState = $this->matrixVectorMultiply($this->F, $this->state);
            $predictedCovariance = $this->addMatrices(
                $this->matrixMultiply($this->F, $this->matrixMultiply($this->P, $this->matrixTranspose($this->F))),
                $this->Q
            );
            
            // Prediction of observation
            $predictedObservation = $this->vectorDot($this->H, $predictedState);
            
            // Innovation (forecast error)
            $innovation = $this->data[$t] - $predictedObservation;
            $innovations[] = $innovation;
            
            // Innovation covariance
            $innovationCovariance = $this->vectorDot($this->H, $this->matrixVectorMultiply($predictedCovariance, $this->H)) + $this->R;
            
            // Kalman gain
            $kalmanGain = $this->scalarVectorMultiply(
                1.0 / $innovationCovariance,
                $this->matrixVectorMultiply($predictedCovariance, $this->H)
            );
            
            // Update step
            $this->state = $this->vectorAdd(
                $predictedState,
                $this->scalarVectorMultiply($innovation, $kalmanGain)
            );
            
            $this->P = $this->subtractMatrices(
                $predictedCovariance,
                $this->matrixMultiply(
                    $this->vectorMatrixMultiply($kalmanGain, $this->H),
                    $predictedCovariance
                )
            );
            
            $states[] = [
                'state' => $this->state,
                'covariance' => $this->P,
                'innovation' => $innovation,
                'predicted' => $predictedObservation,
                'observed' => $this->data[$t]
            ];
        }
        
        return $states;
    }
    
    /**
     * Detect breaking events using innovation analysis
     */
    private function detectBreakingEvents(array $filteredStates): array {
        $innovations = array_column($filteredStates, 'innovation');
        $n = count($innovations);
        $events = [];
        
        // Calculate rolling statistics
        $windowSize = min(12, intval($n / 3));
        
        for ($i = $windowSize; $i < $n - $windowSize; $i++) {
            // Before and after windows
            $before = array_slice($innovations, $i - $windowSize, $windowSize);
            $after = array_slice($innovations, $i, $windowSize);
            
            // Statistical tests for structural break
            $beforeVar = $this->calculateVariance($before);
            $afterVar = $this->calculateVariance($after);
            $beforeMean = array_sum($before) / count($before);
            $afterMean = array_sum($after) / count($after);
            
            // Variance ratio test (F-test)
            $fStat = max($afterVar, $beforeVar) / min($afterVar, $beforeVar);
            
            // Mean shift test (t-test approximation)
            $meanShift = abs($afterMean - $beforeMean);
            $pooledVar = ($beforeVar + $afterVar) / 2;
            $tStat = $pooledVar > 0 ? $meanShift / sqrt($pooledVar / $windowSize) : 0;
            
            // Thresholds for significance
            $fThreshold = 2.5;  // Variance change
            $tThreshold = 2.0;  // Mean change
            
            if ($fStat > $fThreshold || $tStat > $tThreshold) {
                $events[] = [
                    'position' => $i,
                    'type' => $fStat > $fThreshold ? 'variance_break' : 'level_break',
                    'severity' => max($fStat / $fThreshold, $tStat / $tThreshold),
                    'before_period' => $i - $windowSize,
                    'after_period' => $i + $windowSize
                ];
            }
        }
        
        // Remove overlapping events (keep strongest)
        return $this->filterOverlappingEvents($events);
    }
    
    /**
     * Generate forecasts considering breaking events
     */
    private function generateAdaptiveForecasts(int $steps, array $events): array {
        $forecasts = [];
        $currentState = $this->state;
        $currentCovariance = $this->P;
        
        // Check if we're in a post-break period
        $recentBreak = $this->findMostRecentBreak($events);
        
        if ($recentBreak && $this->isRecentBreak($recentBreak)) {
            // Increase process noise for post-break period (more uncertainty)
            $this->Q = $this->scalarMatrixMultiply(2.0, $this->Q);
        }
        
        for ($h = 1; $h <= $steps; $h++) {
            // Predict state forward
            $currentState = $this->matrixVectorMultiply($this->F, $currentState);
            $currentCovariance = $this->addMatrices(
                $this->matrixMultiply($this->F, $this->matrixMultiply($currentCovariance, $this->matrixTranspose($this->F))),
                $this->Q
            );
            
            // Forecast observation
            $forecast = $this->vectorDot($this->H, $currentState);
            
            // Ensure non-negative forecasts for business data
            $forecast = max(0, $forecast);
            
            $forecasts[] = $forecast;
        }
        
        return $forecasts;
    }
    
    /**
     * Calculate innovation variance for model diagnostics
     */
    private function calculateInnovationVariance(array $states): float {
        $innovations = array_column($states, 'innovation');
        return $this->calculateVariance($innovations);
    }
    
    /**
     * Calculate confidence intervals using Kalman filter uncertainty
     */
    private function calculateConfidenceIntervals(array $forecasts): array {
        $intervals = [];
        $uncertainty = sqrt($this->R); // Base measurement uncertainty
        
        foreach ($forecasts as $h => $forecast) {
            // Uncertainty grows with forecast horizon
            $horizonUncertainty = $uncertainty * sqrt($h + 1);
            
            $intervals[] = [
                'forecast' => $forecast,
                'lower_80' => $forecast - 1.28 * $horizonUncertainty,
                'upper_80' => $forecast + 1.28 * $horizonUncertainty,
                'lower_95' => $forecast - 1.96 * $horizonUncertainty,
                'upper_95' => $forecast + 1.96 * $horizonUncertainty
            ];
        }
        
        return $intervals;
    }
    
    // Helper functions for matrix operations
    private function matrixVectorMultiply(array $matrix, array $vector): array {
        $result = [];
        foreach ($matrix as $row) {
            $sum = 0;
            for ($i = 0; $i < count($vector); $i++) {
                $sum += $row[$i] * $vector[$i];
            }
            $result[] = $sum;
        }
        return $result;
    }
    
    private function vectorDot(array $a, array $b): float {
        $sum = 0;
        for ($i = 0; $i < count($a); $i++) {
            $sum += $a[$i] * $b[$i];
        }
        return $sum;
    }
    
    private function vectorAdd(array $a, array $b): array {
        $result = [];
        for ($i = 0; $i < count($a); $i++) {
            $result[] = $a[$i] + $b[$i];
        }
        return $result;
    }
    
    private function scalarVectorMultiply(float $scalar, array $vector): array {
        return array_map(function($x) use ($scalar) { return $scalar * $x; }, $vector);
    }
    
    private function matrixMultiply(array $a, array $b): array {
        $result = [];
        for ($i = 0; $i < count($a); $i++) {
            $result[$i] = [];
            for ($j = 0; $j < count($b[0]); $j++) {
                $sum = 0;
                for ($k = 0; $k < count($b); $k++) {
                    $sum += $a[$i][$k] * $b[$k][$j];
                }
                $result[$i][$j] = $sum;
            }
        }
        return $result;
    }
    
    private function matrixTranspose(array $matrix): array {
        $result = [];
        for ($j = 0; $j < count($matrix[0]); $j++) {
            for ($i = 0; $i < count($matrix); $i++) {
                $result[$j][$i] = $matrix[$i][$j];
            }
        }
        return $result;
    }
    
    private function addMatrices(array $a, array $b): array {
        $result = [];
        for ($i = 0; $i < count($a); $i++) {
            for ($j = 0; $j < count($a[0]); $j++) {
                $result[$i][$j] = $a[$i][$j] + $b[$i][$j];
            }
        }
        return $result;
    }
    
    private function subtractMatrices(array $a, array $b): array {
        $result = [];
        for ($i = 0; $i < count($a); $i++) {
            for ($j = 0; $j < count($a[0]); $j++) {
                $result[$i][$j] = $a[$i][$j] - $b[$i][$j];
            }
        }
        return $result;
    }
    
    private function scalarMatrixMultiply(float $scalar, array $matrix): array {
        $result = [];
        foreach ($matrix as $i => $row) {
            foreach ($row as $j => $value) {
                $result[$i][$j] = $scalar * $value;
            }
        }
        return $result;
    }
    
    private function vectorMatrixMultiply(array $vector, array $matrix): array {
        $result = [];
        for ($i = 0; $i < count($vector); $i++) {
            $result[$i] = [];
            for ($j = 0; $j < count($matrix[0]); $j++) {
                $result[$i][$j] = $vector[$i] * $matrix[0][$j];
            }
        }
        return $result;
    }
    
    private function calculateVariance(array $data): float {
        $mean = array_sum($data) / count($data);
        $sum = 0;
        foreach ($data as $value) {
            $sum += pow($value - $mean, 2);
        }
        return $sum / count($data);
    }
    
    private function filterOverlappingEvents(array $events): array {
        if (empty($events)) return [];
        
        // Sort by severity (highest first)
        usort($events, function($a, $b) {
            return $b['severity'] <=> $a['severity'];
        });
        
        $filtered = [$events[0]];
        $minDistance = 6; // Minimum periods between events
        
        foreach (array_slice($events, 1) as $event) {
            $tooClose = false;
            foreach ($filtered as $existing) {
                if (abs($event['position'] - $existing['position']) < $minDistance) {
                    $tooClose = true;
                    break;
                }
            }
            if (!$tooClose) {
                $filtered[] = $event;
            }
        }
        
        return $filtered;
    }
    
    private function findMostRecentBreak(array $events): ?array {
        if (empty($events)) return null;
        
        $maxPosition = -1;
        $recentBreak = null;
        
        foreach ($events as $event) {
            if ($event['position'] > $maxPosition) {
                $maxPosition = $event['position'];
                $recentBreak = $event;
            }
        }
        
        return $recentBreak;
    }
    
    private function isRecentBreak(array $break): bool {
        $n = count($this->data);
        $periodsAgo = $n - $break['position'];
        return $periodsAgo <= 6; // Consider breaks within last 6 periods as "recent"
    }
}

// Usage Example
/*
// Sample data with COVID-like break
$salesData = [
    100, 105, 110, 115, 120, 125, 130, 135, 140, 145, // Pre-pandemic growth
    150, 155, 160, 165, 170, 175, 180, 185, 190, 195, // Continued growth
    200, 205, 210, 80, 60, 50, 45, 55, 65, 75,        // Pandemic crash and recovery
    85, 95, 105, 115, 125, 135                         // New normal
];

try {
    $forecaster = new KalmanFilterForecaster($salesData, [
        'process_variance' => 0.5,    // How much can the system change
        'observation_variance' => 2.0, // Measurement noise
        'initial_variance' => 10.0     // Initial uncertainty
    ]);
    
    $result = $forecaster->forecast(6);
    
    echo "Kalman Filter Forecasts:\n";
    foreach ($result['forecasts'] as $i => $forecast) {
        echo "Month " . ($i + 1) . ": " . round($forecast, 1) . "\n";
    }
    
    echo "\nDetected Breaking Events:\n";
    foreach ($result['detected_breaks'] as $break) {
        echo "Position: {$break['position']}, Type: {$break['type']}, Severity: " . round($break['severity'], 2) . "\n";
    }
    
    echo "\nInnovation Variance: " . round($result['innovation_variance'], 2) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
*/

?>