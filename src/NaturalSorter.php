<?php

namespace Ocallit\Util;

use \Collator;
use \IntlException;
use function strcasecmp;
use function strtr;
use function uasort;

/**
 * A case and accent insensitivity, natural compare, multi key array sort and collator
 * - natural sort sorts numbers and number substrings gracefully
 *
 * @usage
 * $sorter = new NaturalSorter();
 * $sorter->sort($data, ["age" => "desc", "name"=>"asc"]);
 * $sorter->compare('si", "Sí'); // instead of natcasesort, strcasecmp or <=>:
 *
 * @version 1.1.0
 * @requires php >= 8.3
 * @suggests Internationalization extension (intl)
 *
 */
class NaturalSorter {
    protected Collator $collator;
    protected string $locale;
    protected bool $intlExtensionAvailable;

    public function __construct(string $locale = 'es-MX') {
        $this->locale = $locale;
        $this->intlExtensionAvailable = class_exists(Collator::class);
        $this->setCollator();
    }

    /**
     * Array multikeys natural, case and accent, diacritics insensitive
     * handles numbers and number substrings gracefull
     * $sorter->sort($data, ["name" => "asc", "value" => "desc"]);.
     *
     * @param array<int|string, array<int|string, string|int|float|bool>> &$arrayToSort
     * @param array<int|string, "asc"|"desc"> $keys Key1=>asc|desc, Key2=>asc|desc
     * @return array sorted $arrayToSort
     *
     * @example
     * $sorter = new NaturalSorter();
     * $data = [
     *    ["id" => 1, "name" => "Cat 100", "value" => 50],
     * ["id" => 2, "name" => "cÁt 1", "value" => 10],
     * ["id" => 3, "name" => "Dog 1", "value" => 20],
     * ["id" => 4, "name" => "CAT 8", "value" => 40],
     * ["id" => 5, "name" => "cat 9", "value" => 30],
     * ["id" => 6, "name" => "dog 10", "value" => 60],
     * ["id" => 7, "name" => "Café Latte", "value" => 70],
     * ["id" => 8, "name" => "Cafe Americano", "value" => 80],
     * ["id" => 9, "name" => "Banana", "value" => 90],
     * ["id" => 10, "name" => "apple", "value" => 25],   // Tie group for "apple"
     * ["id" => 11, "name" => "Apple", "value" => 5],    // Tie group for "apple"
     * ["id" => 12, "name" => "Ápple", "value" => 15],   // Tie group for "apple"
     * ["id" => 13, "name" => "Zero", "value" => 0],
     * ];
     *
     * // Sort by "name" ascending (case/accent/numeric insensitive),
     * // then by 'value' descending for ties.
     * $sorter->sort($data, ["name" => "asc", 'value" => "desc"]);
     *
     * // Expected sorted order (names are collated first, then value desc for ties):
     * // - [id => 10, name => 'apple', value => 25]  (collates to "apple", highest value)
     * // - [id => 12, name => 'Ápple', value => 15]  (collates to "apple", middle value)
     * // - [id => 11, name => 'Apple', value => 5]   (collates to "apple", lowest value)
     * // - [id => 9, name => 'Banana', value => 90]
     * // - [id => 8, name => 'Cafe Americano', value => 80]
     * // - [id => 7, name => 'Café Latte', value => 70]
     * // - [id => 2, name => 'cÁt 1', value => 10]
     * // - [id => 4, name => 'CAT 8', value => 40]
     * // - [id => 5, name => 'cat 9', value => 30]
     * // - [id => 1, name => 'Cat 100', value => 50]
     * // - [id => 3, name => 'Dog 1', value => 20]
     * // - [id => 6, name => 'dog 10', value => 60]
     * // - [id => 13, name => 'Zero', value => 0]
     */
    public function sort(array &$arrayToSort, array $keys): array {
        $keyed = [];
        foreach($keys as $k => $order)
            $keyed[$k] = strtolower($order) === 'asc';

        uasort($arrayToSort, function($a, $b) use ($keyed) {
            foreach($keyed as $k => $order) {
                $result = $order ?
                  $this->collator->compare($a[$k] ?? '', $b[$k] ?? '') :
                  $this->collator->compare($b[$k] ?? '', $a[$k] ?? '');
                if($result)
                    return $result;
            }
            return 0;
        });
        return $arrayToSort;
    }

    /**
     *  Natural, case and accent, diacritics insensitive comparator
     *  Tip use instead of <=> and strcasecmp: $sorter->compare('si", "Sí');
     *
     * @param mixed $a
     * @param mixed $b
     * @return int <0 if $a < $b, 0 if $a == $b, >0 if $a > $b
     */
    public function compare($a, $b):int {
        if($this->intlExtensionAvailable)
            return $this->collator->compare((string)$a, (string)$b);
        return strnatcasecmp( $this->unaccent((string)$a), $this->unaccent((string)$b));
    }

    /**
     * A Natural, case and accent, diacritics insensitive collator
     *
     * @return Collator
     */
    public function getCollator(): Collator { return $this->collator;}

    /**
     * Initializes or re-initializes the internal Collator instance
     * Natural, case and accent, diacritics insensitive collator
     * with the current locale, falling back to 'root' if the locale is invalid.
     */
    protected function setCollator(): void {
        if(!$this->intlExtensionAvailable)
            return;
        try {
            $this->collator = new Collator($this->locale);
        } catch(IntlException $e) {
            $this->collator = new Collator('root');
        }
        $this->collator->setAttribute(Collator::STRENGTH, Collator::PRIMARY);
        $this->collator->setAttribute(Collator::CASE_FIRST, Collator::ON);
        $this->collator->setAttribute(Collator::NUMERIC_COLLATION, Collator::ON);
    }

    // region: fallback unaccenting when Intl extension is not available */


    /**
     * Replacements for unaccenting strings when Intl extension is not available.
     */
    protected const array UNACCENT_REPLACEMENTS = [
          'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A', 'Ā' => 'A', 'Ă' => 'A', 'Ą' => 'A',
          'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'ā' => 'a', 'ă' => 'a', 'ą' => 'a',
          'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E', 'Ē' => 'E', 'Ĕ' => 'E', 'Ė' => 'E', 'Ę' => 'E', 'Ě' => 'E',
          'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ē' => 'e', 'ĕ' => 'e', 'ė' => 'e', 'ę' => 'e', 'ě' => 'e',
          'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I', 'Ĩ' => 'I', 'Ī' => 'I', 'Ĭ' => 'I', 'Į' => 'I', 'İ' => 'I',
          'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ĩ' => 'i', 'ī' => 'i', 'ĭ' => 'i', 'į' => 'i', 'ı' => 'i',
          'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O', 'Ō' => 'O', 'Ŏ' => 'O', 'Ő' => 'O',
          'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ō' => 'o', 'ŏ' => 'o', 'ő' => 'o',
          'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U', 'Ũ' => 'U', 'Ū' => 'U', 'Ŭ' => 'U', 'Ů' => 'U', 'Ű' => 'U', 'Ų' => 'U',
          'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ũ' => 'u', 'ū' => 'u', 'ŭ' => 'u', 'ů' => 'u', 'ű' => 'u', 'ų' => 'u',
          'Ç' => 'C', 'ç' => 'c',
          'Ñ' => 'N', 'ñ' => 'n',
          'Ś' => 'S', 'ś' => 's', 'Ş' => 'S', 'ş' => 's', 'Š' => 'S', 'š' => 's',
          'Đ' => 'D', 'đ' => 'd',
          'Ğ' => 'G', 'ğ' => 'g',
          'Ł' => 'L', 'ł' => 'l',
          'Ŕ' => 'R', 'ŕ' => 'r',
          'Ţ' => 'T', 'ţ' => 't',
          'Ÿ' => 'Y', 'ÿ' => 'y',
          'Ž' => 'Z', 'ž' => 'z',
    ];

    /**
     * Removes accents and diacritics from a string, fallback when Intl extension is not available.
     * @param string $string
     * @return string
     */
    protected function unaccent(mixed $string): string {
        return strtr((string)$string, self::UNACCENT_REPLACEMENTS);
    }
    // endregion: fallback unaccenting when Intl extension is not available */

}
