<?php
/** @noinspection PhpRedundantOptionalArgumentInspection */
/** @noinspection PhpUnused */

// table see iaTable,
// header?
// exportBar?
// toolbar?
// breadcrumbs?


namespace Ocallit\Util;

use Stringable;
use function in_array;
use function is_array;

class HtmlEr {

    /**
     * Generates a string of HTML options for a select element, marking the specified values as selected
     * The $options parameter can be
     *     key-value associative array key is the value and value is the text
     *     associative array  see meta
     *    indexed array (value is both value and te)
     *
     * @param array $options An associative array or indexed array of options.
     * @param array|string $selectedValues The value(s) to be selected.
     * @param array $meta Optional metadata for value, text, and attributes. ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']]
     * @return string A string of HTML option elements.
     */
    public function options(
      array        $options,
      array|string $selectedValues,
      array        $meta = ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']]
    ): string {
        if(empty($options))
            return "";
        $isList = array_is_list($options);
        $opt = [];
        foreach($options as $key => $value) {
            if(is_array($value)) {
                $attributes = [];
                $val = $value[$meta['value'] ?? 'id'] ?? $this->array_first($value) ?? "";
                $text = $value[$meta['text'] ?? 'text'] ?? array_values($value)[1] ?? $this->array_first($value) ?? "";
                foreach($value as $attrName => $attrValue) {
                    if(str_starts_with($attrName, 'data')) {
                        $attributes[] = $this->attribute($attrName, $attrValue);
                        continue;
                    }
                    if(in_array($attrName, $meta['attr']))
                        $attributes[] = $this->attribute($attrName, $attrValue);
                }
                $opt[] = "<option " . $this->selected($val, $selectedValues) .
                  (empty($attributes) ? "" : " " . implode(" ", $attributes)) . ">" .
                  htmlentities($text) . "</option>";
                continue;
            }
            if($isList)
                $opt[] = "<option " . $this->selected((string)$value, $selectedValues) . ">" . htmlentities((string)$value) . "</option>";
            else
                $opt[] = "<option " . $this->selected($key, $selectedValues) . ">" . htmlentities((string)$value) . "</option>";
        }
        return implode("", $opt);
    }

    /**
     * Returns " value='$value' " or " value='$value' selected='selected'  htmlentity protected value tag
     *
     * @param string|Stringable|int|float|bool|null $value
     * @param string|Stringable|array<int|string, string|int|float|bool|null> $selectedValues
     * @return string " value='$value' " or " value='$value' selected='selected' "
     */
    public function selected($value, $selectedValues): string {
        $valueTag = $this->attribute("value", $value);
        if(is_array($selectedValues))
            return $valueTag . (in_array($value, $selectedValues, FALSE) ? " selected='selected' " : " ");
        return $valueTag . ((string)$selectedValues == (string)$value ? " selected='selected' " : " ");
    }

    /**
     * Returns " value='$value' " or " value='$value' selected='checked'  htmlentity protected value tag
     *
     * @param string|Stringable|int|float|bool|null $value
     * @param string|Stringable|array<int|string, string|int|float|bool|null> $checkedValues
     * @return string " value='$value' " or " value='$value' selected='checked "
     */
    public function checked($value, $checkedValues): string {
        $valueTag = $this->attribute("value", $value);
        if(is_array($checkedValues))
            return $valueTag . (in_array($value, $checkedValues, FALSE) ? "checked='checked' " : " ");
        return $valueTag . ((string)$checkedValues == (string)$value ? " checked='checked' " : " ");
    }

    public function array2attributes(array $attributes): string {
        $attr = [];
        foreach($attributes as $name => $value)
            $attr[] = $this->attribute($name, $value);
        return implode(" ", $attr);
    }

    public function array2data(array $data): string {
        $attr = [];
        foreach($data as $name => $value)
            $attr[] = $this->attribute("data-$name", $value);
        return implode(" ", $attr);
    }

    public function attribute(string|Stringable $name, $value): string {
        if(!str_contains($value, '"'))
            return $name . '="' . $value . '"';
        if(!str_contains($value, "'"))
            return "$name='$value'";
        return $name . '="' . str_replace(['"', "'"], ['&#34', '&#39;'], (string)$value) . '"';
    }

    public function attributeValue($value): string {
        return '"' . str_replace(['"', "'"], ['&#34;', '&#39;'], (string)$value) . '"';
    }

    protected function array_first(array $array): mixed {
        return $array === [] ? null : $array[array_key_first($array)];
    }

}
