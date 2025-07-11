<?php
declare(strict_types=1);

namespace Tests;

use Ocallit\Util\NaturalSorter;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Stringable;
use Collator;

require_once(__DIR__ . "/../src/NaturalSorter.php");

/** #[CoversClass] \Ocallit\Util\NaturalSorter */
class NaturalSorterTest extends TestCase {
    public static function provideCompareCases(): array {
        return [
          'equal simple strings' => ['abc', 'abc', 0],
          'accent vs plain' => ['café', 'cafe', 0],
          'case insensitive' => ['APPLE', 'apple', 0],
          'numeric string' => ['file 9', 'file 10', -1],
          'stringable objects' => [new class implements Stringable {
              public function __toString(): string {
                  return 'mañana';
              }
          }, 'manana', 0],
          'null comparison' => [NULL, '', 0],
          'bool vs string' => [TRUE, 'true', -1],
        ];
    }

    #[DataProvider('provideCompareCases')]
    public function testCompareIntlUnavailable(mixed $a, mixed $b, int $expected): void {
        $sorter = new class extends NaturalSorter {
            public function __construct() {
                $this->locale = 'es-MX';
                $this->intlExtensionAvailable = FALSE;
            }

            public function exposeCompare($a, $b): int {
                return $this->compare($a, $b);
            }
        };
        $res = $sorter->exposeCompare($a, $b);
        if($res < 0)
            $res = -1;
        elseif($res > 0)
            $res = 1;
        $this->assertSame($expected, $res, "Comparison of '$a' and '$b' results $res, expected result $expected");
    }

    public function testCompareWithIntl(): void {
        $sorter = new NaturalSorter();
        $result = $sorter->compare('a', 'A');
        $this->assertSame(0, $result); // Collator should be case insensitive
    }

    public function testGetCollator(): void {
        $sorter = new NaturalSorter();
        $this->assertInstanceOf(Collator::class, $sorter->getCollator());
    }

    public static function provideSortExamples(): array {
        return [
          'docblock natural sort full array' => [
            'data' => [
              ["id" => 1, "name" => "Cat 100", "value" => 50],
              ["id" => 2, "name" => "cÁt 1", "value" => 10],
              ["id" => 3, "name" => "Dog 1", "value" => 20],
              ["id" => 4, "name" => "CAT 8", "value" => 40],
              ["id" => 5, "name" => "cat 9", "value" => 30],
              ["id" => 6, "name" => "dog 10", "value" => 60],
              ["id" => 7, "name" => "Café Latte", "value" => 70],
              ["id" => 8, "name" => "Cafe Americano", "value" => 80],
              ["id" => 9, "name" => "Banana", "value" => 90],
              ["id" => 10, "name" => "apple", "value" => 25],
              ["id" => 11, "name" => "Apple", "value" => 5],
              ["id" => 12, "name" => "Ápple", "value" => 15],
              ["id" => 13, "name" => "Zero", "value" => 0],
            ],
            'keys' => ['name' => 'asc', 'value' => 'desc'],
            'expected' => [
              ["id" => 10, "name" => "apple", "value" => 25],
              ["id" => 12, "name" => "Ápple", "value" => 15],
              ["id" => 11, "name" => "Apple", "value" => 5],
              ["id" => 9, "name" => "Banana", "value" => 90],
              ["id" => 8, "name" => "Cafe Americano", "value" => 80],
              ["id" => 7, "name" => "Café Latte", "value" => 70],
              ["id" => 2, "name" => "cÁt 1", "value" => 10],
              ["id" => 4, "name" => "CAT 8", "value" => 40],
              ["id" => 5, "name" => "cat 9", "value" => 30],
              ["id" => 1, "name" => "Cat 100", "value" => 50],
              ["id" => 3, "name" => "Dog 1", "value" => 20],
              ["id" => 6, "name" => "dog 10", "value" => 60],
              ["id" => 13, "name" => "Zero", "value" => 0],
            ],
          ],
        ];
    }

    #[DataProvider('provideSortExamples')]
    public function testSort(array $data, array $keys, array $expected): void {
        $sorter = new NaturalSorter();
        $result = $sorter->sort($data, $keys);
        $this->assertSame($expected, array_values($result), 'Sorted array does not match expected');
    }


    public function testUnaccentDirectly(): void {
        $sorter = new class extends NaturalSorter {
            public function __construct() {
                $this->locale = 'es-MX';
                $this->intlExtensionAvailable = FALSE;
            }

            public function exposeUnaccent(string $str): string {
                return $this->unaccent($str);
            }
        };

        $this->assertSame('Cafe', $sorter->exposeUnaccent('Café'));
        $this->assertSame('a', $sorter->exposeUnaccent('á'));
        $this->assertSame('E', $sorter->exposeUnaccent('É'));
    }
}
