<?php
/** @noinspection PhpUnused */


use Kreait\Firebase\Exception\DatabaseException;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Database;

class FirebaseRealTimeDb {
    protected Database $database;

    public function __construct(string $serviceAccountPath) {
        $factory = (new Factory)->withServiceAccount($serviceAccountPath);
        $this->database = $factory->createDatabase();
    }

    /**
     * Replace the Firebase key with the given array as JSON.
     *
     * @param string $key The Firebase key
     * @param array $data The data to store
     * @return void
     * @throws JsonException|DatabaseException
     */
    public function replaceData(string $key, array $data): void {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $this->database->getReference($key)->update(json_decode($json, TRUE, 512, JSON_THROW_ON_ERROR));
    }

    /**
     * Retrieve the Firebase key's data as an array.
     *
     * @param string $key The Firebase key
     * @return array The retrieved data
     * @throws DatabaseException
     */
    public function getData(string $key): array {
        return $this->database->getReference($key)->getValue() ?? [];
    }

    /**
     * Compare the provided array with the Firebase data and return the differences.
     *
     * @param string $key The Firebase key
     * @param array $data The data to compare
     * @return array The differences between stored and provided data
     * @throws DatabaseException
     */
    public function compareData(string $key, array $data): array {
        $firebaseData = $this->getData($key);
        return $this->arrayDiffRecursive($data, $firebaseData);
    }

    /**
     * Recursively compare two arrays and return differences using native PHP functions.
     *
     * @param array $array1 The first array
     * @param array $array2 The second array
     * @return array The differences
     */
    protected function arrayDiffRecursive(array $array1, array $array2): array {
        $diff = array_diff_assoc($array1, $array2);
        $commonKeys = array_intersect_key($array1, $array2);
        foreach($commonKeys as $key => $value) {
            if(is_array($value) && is_array($array2[$key])) {
                $nestedDiff = $this->arrayDiffRecursive($value, $array2[$key]);
                if(!empty($nestedDiff)) {
                    $diff[$key] = $nestedDiff;
                }
            }
        }
        return $diff;
    }


    /**
     * Compare the provided array with the Firebase data and return the differences.
     *
     * @param string $key The Firebase key
     * @param array $data The data to compare
     * @return array The differences between stored and provided data
     * @throws DatabaseException
     */
    public function compareData2(string $key, array $data): array {
        $firebaseData = $this->getData($key);
        return $this->arrayDiffAssocRecursive2($data, $firebaseData);
    }

    /**
     * Recursively compute the difference between two associative arrays.
     *
     * @param array $array1 The first array
     * @param array $array2 The second array
     * @return array The differences
     */
    protected function arrayDiffAssocRecursive2(array $array1, array $array2): array {
        $difference = [];

        foreach($array1 as $key => $value) {
            if(!array_key_exists($key, $array2)) {
                $difference[$key] = $value;
            } elseif(is_array($value) && is_array($array2[$key])) {
                $recursiveDiff = $this->arrayDiffAssocRecursive2($value, $array2[$key]);
                if(!empty($recursiveDiff)) {
                    $difference[$key] = $recursiveDiff;
                }
            } elseif($value !== $array2[$key]) {
                $difference[$key] = $value;
            }
        }
        return $difference;
    }
}
