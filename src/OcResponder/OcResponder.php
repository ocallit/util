<?php
declare(strict_types=1);



   function getRequest(): array {
        $jsonInput = file_get_contents('php://input');
        if(empty($jsonInput))
            return $_REQUEST ?? [];
        $jsonData = json_decode($jsonInput, TRUE);
        if(is_array($jsonData))
            return array_merge($_REQUEST ?? [], $jsonData);
        return $_REQUEST ?? [];
    }



class Execute {



}

/*
 *

$re = '/(\p{Lu}|\d)+/muS';
$str = 'asdDEDf-ebB1at3';
$subst = " $0";
$result = preg_replace($re, $subst, $str);
echo "The result of the substitution is ".$result;
 */
// el plane es hace new x(dbConn) luego do o automatco luego send
// exec es: 1. do(action, request) => permiso-exec-log, 2. send, 3. log_errors. do es un switch or roting que codificar
// exec es: 2. automatico(accion, request, instance) => permiso-exec-log, 2. send, 3. log_errors. automatico hace el routing
// duda coso que corre en 1 o 2 false+error_message, o true+data y logea
//      los helpers son: getRequest, autoRun, niceErrors, report, send cuales sirven?
class OcResponder {
    protected $sqlExecutor; // pal show de nice sql error

    protected array $response;

    public function __construct($sqlExecutor) {
        $this->sqlExecutor = $sqlExecutor;
    }

    public function executeAction() {
        try {

            return;
        } catch(mysqli_sql_exception $e) {
            $this->sqlNiceError($e);
        } catch(Throwable $e) {

        }
    }

    protected function readRequest(): array {
        $jsonInput = file_get_contents('php://input');
        if(empty($jsonInput))
            return $_REQUEST ?? [];
        $jsonData = json_decode($jsonInput, TRUE);
        if(is_array($jsonData))
            return array_merge($_REQUEST ?? [], $jsonData);
        return $_REQUEST ?? [];
    }

    protected function automatic(object $instance, string $methodName, array $pickParamsFrom): mixed {
        if(!method_exists($instance, $methodName)) {
            return $instance->$methodName();
        }

        $method = new \ReflectionMethod($instance, $methodName);
        $params = $method->getParameters();
        if(count($params) === 0) {
            return $instance->$methodName();
        }

        $args = [];
        foreach($params as $param) {
            $paramName = $param->getName();
            if($paramName === '\Ocallit\SqlEr\SqlExecutor') {
                $args[$paramName] = $this->gSqlExecutor;
                continue;
            }
            $type = $param->getType();
            if ($type === null) {
                $args[$paramName] = $pickParamsFrom[$paramName] ?? "";
                continue;
            }
            if(array_key_exists($paramName, $pickParamsFrom)) {
                $names = [];
                if($type instanceof ReflectionNamedType) {
                    $names = [ltrim($type->getName(), '\\')];
                } elseif($type instanceof ReflectionUnionType) {
                    foreach($type->getTypes() as $t) {
                        if($t instanceof ReflectionNamedType) {
                            $names[] = ltrim($t->getName(), '\\');
                        }
                    }
                } else {
                    $args[$paramName] = $pickParamsFrom[$paramName];
                    continue;
                }

                if(in_array('string', $names, TRUE)) {
                    $args[$paramName] = $pickParamsFrom[$paramName];
                    continue;
                }
                if(in_array('DateTimeImmutable', $names, TRUE)) {
                    $args[$paramName] = new DateTimeImmutable($pickParamsFrom[$paramName]);
                    continue;
                }
                if(in_array('DateTime', $names, TRUE)) {
                    $args[$paramName] = new DateTime($pickParamsFrom[$paramName]);
                    continue;
                }
                if(in_array('float', $names, TRUE)) {
                    $args[$paramName] = $pickParamsFrom[$paramName];
                    continue;
                }
                if(in_array('int', $names, TRUE)) {
                    $args[$paramName] = $pickParamsFrom[$paramName];
                    continue;
                }
                if(in_array('bool', $names, TRUE)) {
                    $args[$paramName] = $pickParamsFrom[$paramName];
                    continue;
                }
            }
            if($param->isDefaultValueAvailable()) {
                $args[$paramName] = $param->getDefaultValue();
                continue;
            }
            if($type->allowsNull()) {
                $args[$paramName] = null;
                continue;
            }
            throw new \InvalidArgumentException("Missing required parameter '$paramName'.");
        }
        return $method->invokeArgs($instance, $args);
    }





    protected function sendResult($result) {

        if(!is_array($result)) {
            $result = ['data' => $result];
        }

        $ok = $result['ok'] ?? $result['success'] ?? FALSE;
        $message = $result['message'] ?? $result['error'] ?? NULL;
        $data = $result['data'] ?? NULL;
        $httpCode = $result['httpCode'] ?? $result['http_code'] ?? ($ok ? 200 : 500);

        $this->respond($ok, $message, $data, $httpCode);
    }

    /**
     * Send JSON response and exit - super simple
     */
    protected function respond($ok, $message = NULL, $data = NULL, $httpCode = NULL) {

        if($httpCode === NULL) {
            $httpCode = $ok ? 200 : 500;
        }
        if($httpCode !== 200) {
            http_response_code($httpCode);
        }

        echo json_encode([
          'success' => $ok,
          'error' => $ok ? NULL : $message,
          'data' => $data,
        ]);

        exit;
    }

    /**
     * Handle database errors with user-friendly messages
     */
    protected function sqlNiceError(mysqli_sql_exception $e) {
        if($this->sqlExecutor->is_last_error_duplicate_key()) {
            $this->respond(FALSE, 'Registro Duplicado', NULL, 409);
        } elseif($this->sqlExecutor->is_last_error_foreign_key_violation()) {
            $this->respond(FALSE, 'Referencia inválida', NULL, 400);
        } elseif($this->sqlExecutor->is_last_error_child_records_exist()) {
            $this->respond(FALSE, 'No se puede borrar, hay datos que dependen de el.', NULL, 409);
        } else {
            error_log("Database error $this->accion: " . $e->getMessage());
            $this->respond(FALSE, 'Error en la base dedatos', NULL, 500);
        }
    }


}