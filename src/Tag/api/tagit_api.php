<?php
// File: categories.php
// Path: /ocCateogUI/api/crud_tags
// Version: 1.1.0

global $gSoyWorker; $gSoyWorker=true;
require_once 'C:\vamp\apache\htdocs\vitex\inc\config.php';
global $gSqlExecutor;
$tagsDbSchema =  [
  "CREATE TABLE IF NOT EXISTS tagit(
        tagit_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        catalogName VARCHAR(64) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL DEFAULT '',
        icon VARCHAR(64) NOT NULL DEFAULT '',
        desde DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE innodb",
  "CREATE TABLE IF NOT EXISTS tagitTags(
        tagitTags_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        tagit_id MEDIUMINT UNSIGNED NOT NULL,
        CONSTRAINT fk_catalog FOREIGN KEY (tagit_id) REFERENCES tagit(tagit_id) ON DELETE CASCADE,
        tag VARCHAR(64) NOT NULL,
        UNIQUE KEY tag_unico(tagit_id, tag)  
    )ENGINE innodb ",
    "CREATE TABLE IF NOT EXISTS tagitTagged (
        tagitTagged_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
        tagitTags_id MEDIUMINT UNSIGNED NOT NULL,
            CONSTRAINT fk_tag FOREIGN KEY (tagitTags_id) REFERENCES tagitTags(tagitTags_id) ON DELETE CASCADE.
        pk VARCHAR(32) NOT NULL,
        tableName varchar(128) NOT NULL,
        UNIQUE KEY unico(pk, tableName, tagitTags_id)
    )",
];
foreach($tagsDbSchema as $schemaQuery)
   try { $gSqlExecutor->query($schemaQuery); } catch(Throwable $t) {}

header('Content-Type: application/json');

// Helper function to send JSON response
function sendResponse($success, $error = "", $data = []) {
    echo json_encode([
        'success' => $success,
        'error' => $error,
        'data' => $data
    ]);
    exit;
}

try {
    $catalog_id = $_REQUEST['catalog_id'] ?? '';

    //$catalogExists = $gSqlExecutor->firstValue("SELECT COUNT(*) FROM tagit WHERE tagit_id = ?", [$catalog_id]);
    //if (!$catalogExists) {
    //    sendResponse(false, 'Invalid catalog ID');
    //}

    $action = $_REQUEST['action'] ?? '';
    switch ($action) {
        case 'tagList':
            // Get all tags for this catalog
            $tags = $gSqlExecutor->array(
                "SELECT tagitTags_id as id, tag as text 
                 FROM tagitTags 
                 WHERE tagit_id = ? 
                 ORDER BY tag",
                [$catalog_id]
            );
            sendResponse(true, null, $tags);
            break;
            
        case 'tagAdd':
            $text = trim($_POST['text'] ?? '');
            
            if (empty($text)) {
                sendResponse(false, 'Tag text cannot be empty');
            }
            
            // Insert new tag - let the database handle uniqueness
            try {
                $gSqlExecutor->query(
                    "INSERT INTO tagitTags (tagit_id, tag) VALUES (?, ?)",
                    [$catalog_id, $text]
                );
                
                $newId = $gSqlExecutor->lastInsertId();
                sendResponse(true, null, ['id' => $newId]);
                
            } catch (Exception $e) {
                // Check if it's a duplicate key error
                if ($gSqlExecutor->is_last_error_duplicate_key()) {
                    sendResponse(false, 'Tag already exists in this catalog');
                } else {
                    sendResponse(false, 'Failed to add tag: ' . $e->getMessage());
                }
            }
            break;
            
        case 'tagUpdate':
            $id = $_POST['id'] ?? '';
            $text = trim($_POST['text'] ?? '');
            
            if (empty($id)) {
                sendResponse(false, 'Error de transmisión no llego el tag id');
            }
            
            if (empty($text)) {
                sendResponse(false, 'Tag es un dato requerido');
            }
            
            // Check if this tag belongs to the current catalog
            $belongsToCatalog = $gSqlExecutor->firstValue(
                "SELECT COUNT(*) 
                 FROM tagitTags 
                 WHERE tagitTags_id = ? AND tagit_id = ?",
                [$id, $catalog_id]
            );
            
            if (!$belongsToCatalog) {
                sendResponse(false, 'Tag no encontrada!');
            }

            try {
                $gSqlExecutor->query("UPDATE tagitTags SET tag = ? WHERE tagitTags_id = ?", [$text, $id]);
                sendResponse(true);
            } catch (Exception $e) {
                if ($gSqlExecutor->is_last_error_duplicate_key()) {
                    sendResponse(false, "Ya existe ese tag");
                } else {
                    sendResponse(false, 'Failed to update tag: ' . $e->getMessage());
                }
            }
            break;
            
        case 'tagDelete':
            $id = $_POST['id'] ?? '';
            if (empty($id)) {
                sendResponse(false, 'Falto el Id a borrar');
            }

            $isUsed = $gSqlExecutor->firstValue("SELECT COUNT(*) FROM tagitTagged WHERE tagitTags_id = ?", [$id]);
            if ($isUsed > 0) {
                sendResponse(false, "Cannot delete tag - it's being used in $isUsed items");
            }

            try {
                $gSqlExecutor->query("DELETE FROM tagitTags WHERE tagitTags_id = ?", [$id]);
                sendResponse(true);
            } catch (Exception $e) {
                sendResponse(false, 'No pude borrar el tag: ' . $e->getMessage());
            }
            break;
            
        default:
            sendResponse(false, "Unknown action: $action");
    }

} catch(\mysqli_sql_exception $e) {
    sendResponse(false, 'Error en la base de datos: ' . $e->getMessage());
} catch(Exception $e) {
    sendResponse(false, 'Error: ' . $e->getMessage());
}
