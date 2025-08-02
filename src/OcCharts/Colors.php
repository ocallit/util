<?php
/** @noinspection PhpUnused */
/** @noinspection PhpLoopCanBeConvertedToArrayMapInspection */


class Colors {

    protected array $palette = [
        '#000000', '#0074D9', '#FF851B', '#2ECC40',
        '#B10DC9', '#FF4136', '#85144b', '#3D9970',
        '#FFDC00', '#001f3f', '#F012BE', '#7FDBFF',
    ];

    public function getPallete():array {return $this->palette;}

    public function adjustColors(array $id2Color, array $palette, float $similarityThreshold = 50): array {
        $usedColors = [];
        $result = [];

        foreach($id2Color as $id => $requestedColor)
            $result[$id] = $this->assignColor($requestedColor, $palette, $usedColors, $similarityThreshold);

        return $result;
    }

    protected function assignColor(string $requestedColor, array &$palette, array &$usedColors, float $similarityThreshold = 50): string {
        $requestedColor = strtolower(trim($requestedColor));

        // Fallback if not a valid hex color
        if (!preg_match('/^#[0-9a-f]{6}$/i', $requestedColor)) {
            $requestedColor = '';
        }

        if (
          $requestedColor &&
          $this->isReadable($requestedColor) &&
          !in_array($requestedColor, $usedColors, true) &&
          !$this->isSimilar($requestedColor, $usedColors, $similarityThreshold)
        ) {
            $usedColors[] = $requestedColor;
            return $requestedColor;
        }

        foreach ($palette as $i => $color) {
            $color = strtolower($color);
            if (
              $this->isReadable($color) &&
              !in_array($color, $usedColors, true) &&
              !$this->isSimilar($color, $usedColors, $similarityThreshold)
            ) {
                unset($palette[$i]);
                $usedColors[] = $color;
                return $color;
            }
        }
        return '#000000';
    }

    protected function isReadable(string $color, string $background = "#FFFFFF"): bool {
        return $this->contrastRatio($color, $background) >= 4.5;
    }

    protected function isSimilar(string $newColor, array $usedColors, float $threshold = 50): bool {
        foreach ($usedColors as $used) {
            if ($this->colorDistance($newColor, $used) < $threshold) {
                return true;
            }
        }
        return false;
    }

    protected function getLuminance(string $hex): float {
        $hex = ltrim($hex, '#');
        [$r, $g, $b] = [
          hexdec(substr($hex, 0, 2)) / 255,
          hexdec(substr($hex, 2, 2)) / 255,
          hexdec(substr($hex, 4, 2)) / 255,
        ];
        foreach (['r', 'g', 'b'] as $c) {
            ${$c} = (${$c} <= 0.03928) ? (${$c} / 12.92) : pow(((${$c} + 0.055) / 1.055), 2.4);
        }
        return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
    }

    protected function contrastRatio(string $hex1, string $hex2): float {
        $L1 = $this->getLuminance($hex1);
        $L2 = $this->getLuminance($hex2);
        return ($L1 > $L2) ? ($L1 + 0.05) / ($L2 + 0.05) : ($L2 + 0.05) / ($L1 + 0.05);
    }

    protected function hexToRgb(string $hex): array {
        $hex = ltrim($hex, '#');
        return [
          hexdec(substr($hex, 0, 2)),
          hexdec(substr($hex, 2, 2)),
          hexdec(substr($hex, 4, 2)),
        ];
    }

    protected function colorDistance(string $hex1, string $hex2): float {
        [$r1, $g1, $b1] = $this->hexToRgb($hex1);
        [$r2, $g2, $b2] = $this->hexToRgb($hex2);
        return sqrt(($r2 - $r1) ** 2 + ($g2 - $g1) ** 2 + ($b2 - $b1) ** 2);
    }

}
