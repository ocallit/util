<?php
/**
 * Advanced File Validation with Multiple Security Layers
 * Demonstrates file signature validation vs MIME type checking
 */

class AdvancedFileValidator
{
    // File signatures (magic bytes) - the most reliable validation
    private const FILE_SIGNATURES = [
        'jpeg' => [
            "\xFF\xD8\xFF\xDB",           // JPEG raw
            "\xFF\xD8\xFF\xE0",           // JPEG/JFIF
            "\xFF\xD8\xFF\xE1",           // JPEG/EXIF
            "\xFF\xD8\xFF\xE2",           // JPEG/EXIF
            "\xFF\xD8\xFF\xE3",           // JPEG/EXIF
            "\xFF\xD8\xFF\xE8",           // SPIFF
        ],
        'png' => [
            "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"  // PNG signature
        ],
        'gif' => [
            "GIF87a",                     // GIF87a
            "GIF89a"                      // GIF89a
        ],
        'pdf' => [
            "%PDF-1.",                    // PDF versions
            "%PDF-2."
        ],
        'zip' => [
            "PK\x03\x04",                 // ZIP file
            "PK\x05\x06",                 // Empty ZIP
            "PK\x07\x08"                  // ZIP spanning
        ],
        'exe' => [
            "MZ"                          // Windows PE executable
        ],
        'php' => [
            "<?php",                      // PHP opening tag
            "<?=",                        // PHP short tag
            "<script language=\"php\">"   // Alternative PHP
        ]
    ];

    /**
     * Level 1: File Signature Validation (Most Secure)
     * Checks actual file headers/magic bytes
     */
    public function validateFileSignature(string $filePath, array $allowedTypes): array
    {
        $result = ['valid' => false, 'detected_type' => null, 'confidence' => 'high'];
        
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return $result;
        }

        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            return $result;
        }

        // Read first 32 bytes for signature checking
        $bytes = fread($handle, 32);
        fclose($handle);

        // Check against all signatures
        foreach ($allowedTypes as $type) {
            if (!isset(self::FILE_SIGNATURES[$type])) {
                continue;
            }

            foreach (self::FILE_SIGNATURES[$type] as $signature) {
                if (str_starts_with($bytes, $signature)) {
                    $result['valid'] = true;
                    $result['detected_type'] = $type;
                    return $result;
                }
            }
        }

        // Check for dangerous signatures even if not in allowed types
        $this->detectDangerousSignatures($bytes, $result);

        return $result;
    }

    /**
     * Level 2: MIME Type Validation (Medium Security)
     * Uses PHP's finfo functions
     */
    public function validateMimeType(string $filePath, array $allowedMimes): array
    {
        $result = ['valid' => false, 'detected_mime' => null, 'confidence' => 'medium'];
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if (!$finfo) {
            return $result;
        }

        $detectedMime = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        $result['detected_mime'] = $detectedMime;
        $result['valid'] = in_array($detectedMime, $allowedMimes);

        return $result;
    }

    /**
     * Level 3: Deep Content Analysis (Highest Security)
     * Validates file structure throughout the file
     */
    public function validateImageStructure(string $filePath): array
    {
        $result = ['valid' => false, 'analysis' => [], 'confidence' => 'very_high'];

        // Use getimagesize for basic validation
        $imageInfo = getimagesize($filePath);
        if (!$imageInfo) {
            $result['analysis'][] = 'Failed getimagesize() check';
            return $result;
        }

        $result['analysis'][] = "Dimensions: {$imageInfo[0]}x{$imageInfo[1]}";
        $result['analysis'][] = "Type: {$imageInfo[2]}";

        // Additional checks for JPEG
        if ($imageInfo[2] === IMAGETYPE_JPEG) {
            if (!$this->validateJpegStructure($filePath)) {
                $result['analysis'][] = 'Invalid JPEG structure detected';
                return $result;
            }
        }

        // Additional checks for PNG
        if ($imageInfo[2] === IMAGETYPE_PNG) {
            if (!$this->validatePngStructure($filePath)) {
                $result['analysis'][] = 'Invalid PNG structure detected';
                return $result;
            }
        }

        $result['valid'] = true;
        return $result;
    }

    /**
     * Level 4: Content Scanning for Malicious Code
     */
    public function scanForMaliciousContent(string $filePath): array
    {
        $result = ['clean' => true, 'threats' => [], 'confidence' => 'high'];
        
        $content = file_get_contents($filePath);
        
        // Common malicious patterns
        $maliciousPatterns = [
            '/\<\?php/i',                    // PHP tags
            '/\<script/i',                   // Script tags
            '/eval\s*\(/i',                  // eval() calls
            '/system\s*\(/i',                // system() calls
            '/exec\s*\(/i',                  // exec() calls
            '/shell_exec\s*\(/i',            // shell_exec() calls
            '/passthru\s*\(/i',              // passthru() calls
            '/file_get_contents\s*\(/i',     // Suspicious file operations
            '/fopen\s*\(/i',                 // File operations
            '/curl_exec\s*\(/i',             // Network operations
            '/base64_decode\s*\(/i',         // Encoded content
        ];

        foreach ($maliciousPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                $result['clean'] = false;
                $result['threats'][] = "Suspicious pattern found: " . $pattern;
            }
        }

        return $result;
    }

    /**
     * Comprehensive validation using all methods
     */
    public function comprehensiveValidation(
        string $filePath, 
        array $allowedTypes, 
        array $allowedMimes,
        bool $deepScan = true
    ): array {
        $results = [
            'overall_valid' => false,
            'signature_check' => $this->validateFileSignature($filePath, $allowedTypes),
            'mime_check' => $this->validateMimeType($filePath, $allowedMimes),
            'content_scan' => $this->scanForMaliciousContent($filePath),
            'recommendations' => []
        ];

        // For images, do deep structure validation
        if (in_array('jpeg', $allowedTypes) || in_array('png', $allowedTypes) || in_array('gif', $allowedTypes)) {
            if ($deepScan) {
                $results['structure_check'] = $this->validateImageStructure($filePath);
            }
        }

        // Determine overall validity
        $signatureValid = $results['signature_check']['valid'];
        $mimeValid = $results['mime_check']['valid'];
        $contentClean = $results['content_scan']['clean'];
        $structureValid = $results['structure_check']['valid'] ?? true;

        // All checks must pass
        $results['overall_valid'] = $signatureValid && $mimeValid && $contentClean && $structureValid;

        // Generate recommendations
        if (!$signatureValid) {
            $results['recommendations'][] = 'File signature does not match allowed types';
        }
        if (!$mimeValid) {
            $results['recommendations'][] = 'MIME type validation failed';
        }
        if (!$contentClean) {
            $results['recommendations'][] = 'Malicious content detected - REJECT FILE';
        }
        if (!$structureValid) {
            $results['recommendations'][] = 'File structure validation failed';
        }

        return $results;
    }

    /**
     * Detect dangerous file signatures
     */
    private function detectDangerousSignatures(string $bytes, array &$result): void
    {
        $dangerousTypes = ['exe', 'php'];
        
        foreach ($dangerousTypes as $type) {
            foreach (self::FILE_SIGNATURES[$type] as $signature) {
                if (str_starts_with($bytes, $signature)) {
                    $result['detected_type'] = $type;
                    $result['warning'] = "Dangerous file type detected: $type";
                    break 2;
                }
            }
        }
    }

    /**
     * Advanced JPEG structure validation
     */
    private function validateJpegStructure(string $filePath): bool
    {
        $handle = fopen($filePath, 'rb');
        if (!$handle) return false;

        // Check JPEG markers throughout the file
        $data = fread($handle, 4);
        if (substr($data, 0, 2) !== "\xFF\xD8") {
            fclose($handle);
            return false;
        }

        // Look for valid JPEG end marker
        fseek($handle, -2, SEEK_END);
        $end = fread($handle, 2);
        fclose($handle);

        return $end === "\xFF\xD9";
    }

    /**
     * Advanced PNG structure validation
     */
    private function validatePngStructure(string $filePath): bool
    {
        $handle = fopen($filePath, 'rb');
        if (!$handle) return false;

        // Check PNG signature
        $signature = fread($handle, 8);
        if ($signature !== "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A") {
            fclose($handle);
            return false;
        }

        // Check for IHDR chunk (must be first)
        $chunkLength = fread($handle, 4);
        $chunkType = fread($handle, 4);
        fclose($handle);

        return $chunkType === "IHDR";
    }
}

// Usage Example
/*
$validator = new AdvancedFileValidator();

// Comprehensive validation
$result = $validator->comprehensiveValidation(
    '/path/to/uploaded/file.jpg',
    ['jpeg', 'png'],           // Allowed file types (by signature)
    ['image/jpeg', 'image/png'], // Allowed MIME types
    true                       // Enable deep scanning
);

if ($result['overall_valid']) {
    echo "File is safe to use";
} else {
    echo "File validation failed:\n";
    foreach ($result['recommendations'] as $rec) {
        echo "- $rec\n";
    }
}

// Individual checks
$signatureResult = $validator->validateFileSignature('/path/to/file.jpg', ['jpeg']);
$mimeResult = $validator->validateMimeType('/path/to/file.jpg', ['image/jpeg']);
$contentResult = $validator->scanForMaliciousContent('/path/to/file.jpg');
*/
?>