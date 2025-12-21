<?php
use Ocallit\Sqler\SqlExecutor;
use ocallit\Util\OcPermissions\OcPermissions;

require_once( __DIR__ . "/../../config/config.php" );
require_once( __DIR__ . "/OcPermissions.php");
global $SqlExecutor;
global $gSqlExecutor;
$SqlExecutor = $gSqlExecutor;

function sTrim($s) {
    if($s === null)
        return "";
    return trim(preg_replace('/\s\s+/', ' ', (string)$s));
}


$gPermisador = new OcPermissions($SqlExecutor);
$gPuede = $gPermisador->permiso("Usuarios, Roles y Permisos");
if(empty($gPuede)) {
    echo "<div style='margin:3em;width:auto;text-align: center'><h1>Sin Permisos</h1><a href='../'>Inicio</a></div>";
    die();
}
