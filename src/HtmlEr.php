<?php
/** @noinspection PhpRedundantOptionalArgumentInspection */
/** @noinspection PhpMissingParamTypeInspection */
/** @noinspection PhpUnused */

// table see iaTable,
// header?
// exportBar?
// toolbar?
// breadcrumbs?


namespace Ocallit\Util;
use Stringable;

class HtmlEr {


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
                $val = $value[$meta['value'] ?? 'id'] ?? reset($value);
                $text = $value[$meta['text'] ?? 'text'] ?? array_values($value)[1] ?? reset($value);
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
                $opt[] = "<option " . $this->selected($value, $selectedValues) . ">" . htmlentities($value) . "</option>";
            else
                $opt[] = "<option " . $this->selected($key, $selectedValues) . ">" . htmlentities($value) . "</option>";
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
        $val = $value instanceof Stringable ? (string)$value : $value;
        $valueTag = " value='" . $this->value((string)$val) . "' ";
        if(is_array($selectedValues))
            return $valueTag . (in_array($value, $selectedValues, FALSE) ? " selected='selected' " : " ");
        if($selectedValues instanceof Stringable)
            return $valueTag . ((string)$selectedValues == $val ? " selected='selected' " : " ");
        return $valueTag . ($selectedValues == $value ? " selected='selected' " : " ");
    }

    /**
     * Returns " value='$value' " or " value='$value' selected='checked'  htmlentity protected value tag
     *
     * @param string|Stringable|int|float|bool|null $value
     * @param string|Stringable|array<int|string, string|int|float|bool|null> $checkedValues
     * @return string " value='$value' " or " value='$value' selected='checked "
     */
    public function checked($value, $checkedValues): string {
        $val = $value instanceof Stringable ? (string)$value : $value;
        $valueTag = $this->attribute("value", $val);
        if(is_array($checkedValues))
            return $valueTag . (in_array($val, $checkedValues, FALSE) ? "checked='checked' " : " ");
        if($checkedValues instanceof Stringable)
            return $valueTag . ((string)$checkedValues === $val ? " checked='checked' " : " ");
        return $valueTag . ($checkedValues == $value ? " checked='checked' " : " ");
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
        return '"' . str_replace(['"', "'"], ['&#34', '&#39;'], (string)$value) . '"';
    }

}
