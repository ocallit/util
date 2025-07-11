<?php

namespace Ocallit\Struct;

use ArgumentCountError;
use ArrayIterator;
use ReflectionClass;
use Traversable;
use function count;
use function get_object_vars;
use function property_exists;
use function strcasecmp;

/**
 * Traits for classes that implements \ArrayAccess, \Countable, \IteratorAggregate
 * with Case and Accent Insensitive access to properties, Inmutable and or Readonly.
 * final class param implements \ArrayAccess, \Countable {
 *   use DataStructCaseInsensitive;
 *   ...
 * }
 *
*/

/**
 * @param object $instance
 * @return array<string|mixed>
 */
function get_object_public_vars(object $instance):array {return get_object_vars($instance);}

trait Struct {

    public function offsetExists($offset): bool {return property_exists($this, $offset); }

    public function offsetGet($offset): mixed {return $this->$offset; }

    public function offsetSet($offset, $value): void {$this->$offset = $value;}

    public function offsetUnset(mixed $offset): void {unset($this->$offset);}

    public static function fromArray(array $data): static {
        $constructor = (new ReflectionClass(static::class))->getConstructor();
        // If there's no constructor, just create an empty instance and populate it
        if(!$constructor) {
            $instance = new static();
            foreach($data as $key => $value) {
                $instance->$key = $value;
            }
            return $instance;
        }

        $params = [];
        foreach($constructor->getParameters() as $param) {
            $paramName = $param->getName();
            if(array_key_exists($paramName, $data)) {
                $params[] = $data[$paramName];
            } elseif($param->isDefaultValueAvailable()) {
                $params[] = $param->getDefaultValue();
            } else {
                throw new ArgumentCountError("Missing required parameter: $paramName");
            }
        }
        return new static(...$params);
    }

    public function toArray(): array { return get_object_public_vars($this); }

    public function count(): int {return count($this->toArray());}

    /**
     * Returns an iterator for the public properties of the object.
     * Required for implementing IteratorAggregate, allows use in foreach.
     * @return Traversable
     */
    public function getIterator(): Traversable {return new ArrayIterator($this->toArray());}

    public function array_key_exists($key):bool {return property_exists($this, $key);}

    public function array_keys(): array {return array_keys(get_object_public_vars($this));}

    public function array_values(): array { return array_values(get_object_public_vars($this));}

}

trait StructCaseAndAccentInsensitive {
    use Struct;
    public function offsetExists($offset): bool {
        if(property_exists($this, $offset))
            return true;
        foreach(get_object_vars($this) as $property => $_)
            if(strcasecmp($property, $offset) === 0)
                return true;
        return false;
    }

    public function offsetGet($offset): mixed {
        if(property_exists($this, $offset))
            return $this->$offset;
        foreach(get_object_vars($this) as $property => $_)
            if(strcasecmp($property, $offset) === 0)
                return $this->$property;
        return null;
    }

    public function offsetSet($offset, $value): void {
        if(property_exists($this, $offset)) {
            $this->$offset = $value;
            return;
        }
        foreach(get_object_vars($this) as $property => $_)
            if(strcasecmp($property, $offset) === 0) {
                $this->$property = $value;
                return;
            }
        $this->$offset = $value;
    }

    public function offsetUnset(mixed $offset): void {
        if(property_exists($this, $offset)) {
            unset($this->$offset);
            return;
        }
        foreach(get_object_vars($this) as $property => $_)
            if(strcasecmp($property, $offset) === 0) {
                unset($this->$property);
                return;
            }
    }
}

trait StructInmutable {
    use Struct;

    public function offsetSet($offset, $value): void {throw new \Error("Cannot modify immutable property: $offset.");}

    public function offsetUnset(mixed $offset): void {throw new \Error("Cannot unset immutable property: $offset.");}

}

trait InmutableCaseInsensitive {
    use StructCaseAndAccentInsensitive, StructInmutable {
        StructCaseAndAccentInsensitive::offsetExists insteadof StructInmutable;
        StructCaseAndAccentInsensitive::offsetGet insteadof StructInmutable;
        StructInmutable::offsetSet insteadof StructCaseAndAccentInsensitive;
        StructInmutable::offsetUnset insteadof StructCaseAndAccentInsensitive;
    }
}

trait StructReadOnly {
    use Struct;

    public function offsetSet($offset, $value): void {
        if($this->offsetExists($offset))
            throw new \Error("Cannot modify readonly property: $offset");
        $this->$offset = $value;
    }

    public function offsetUnset(mixed $offset): void {throw new \Error("Cannot unset readonly property: $offset.");}
}

trait structReadOnlyCaseInsensitive {
    use StructCaseAndAccentInsensitive;
    use StructReadOnly {
        StructCaseAndAccentInsensitive::offsetExists insteadof StructReadOnly;
        StructCaseAndAccentInsensitive::offsetGet insteadof StructReadOnly;
        StructReadOnly::offsetSet insteadof StructCaseAndAccentInsensitive;
        StructReadOnly::offsetUnset insteadof StructCaseAndAccentInsensitive;
    }
}
