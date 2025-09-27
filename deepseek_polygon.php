<?php

function isPointInPolygon(float $pointLat, float $pointLng, array $polygon): bool
{
    $intersections = 0;
    $vertexCount = count($polygon);
    
    // If polygon has less than 3 points, it can't enclose an area
    if ($vertexCount < 3) {
        return false;
    }
    
    // Iterate through each edge of the polygon
    for ($i = 0; $i < $vertexCount; $i++) {
        $vertex1 = $polygon[$i];
        $vertex2 = $polygon[($i + 1) % $vertexCount];
        
        // Check if point is exactly on a vertex
        if ($vertex1[0] == $pointLat && $vertex1[1] == $pointLng) {
            return true;
        }
        
        // Check if point is on horizontal edge
        if ($vertex1[1] == $vertex2[1] && $vertex1[1] == $pointLng) {
            if ($pointLat >= min($vertex1[0], $vertex2[0]) && 
                $pointLat <= max($vertex1[0], $vertex2[0])) {
                return true;
            }
        }
        
        // Check if edge crosses the horizontal ray from point to right
        if (($vertex1[1] > $pointLng) != ($vertex2[1] > $pointLng)) {
            // Calculate the latitude where the edge crosses the point's longitude
            $latIntersect = ($vertex2[0] - $vertex1[0]) * ($pointLng - $vertex1[1]) 
                          / ($vertex2[1] - $vertex1[1]) + $vertex1[0];
            
            // Check if intersection point is to the right of our point
            if ($latIntersect == $pointLat) {
                return true; // Point is exactly on the edge
            }
            
            if ($latIntersect > $pointLat) {
                $intersections++;
            }
        }
    }
    
    // If odd number of intersections, point is inside polygon
    return ($intersections % 2) == 1;
}

// Example usage:
$polygon = [
    [40.7128, -74.0060], // New York City
    [40.7138, -73.9860], 
    [40.7228, -73.9860],
    [40.7228, -74.0260],
    [40.7028, -74.0260]
];

// Test points
$testPoint1 = [40.7178, -74.0060]; // Should be inside
$testPoint2 = [40.6900, -74.0060]; // Should be outside

$result1 = isPointInPolygon($testPoint1[0], $testPoint1[1], $polygon);
$result2 = isPointInPolygon($testPoint2[0], $testPoint2[1], $polygon);

echo "Point 1 inside polygon: " . ($result1 ? 'true' : 'false') . "\n";
echo "Point 2 inside polygon: " . ($result2 ? 'true' : 'false') . "\n";

?>