


CREATE TABLE actividad (
    actividad_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad VARCHAR(64) UNIQUE NOT NULL,
    descripcion LONGTEXT,
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE actividad_permiso (
    actividad_permiso_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad_id MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (actividad_id) REFERENCES actividad(actividad_id) ON DELETE CASCADE,
    permiso VARCHAR(16) NOT NULL,
    UNIQUE KEY permiso_por_actividad(actividad_id, permiso),
    etiqueta VARCHAR(16) NOT NULL,
    UNIQUE KEY etiqueta_por_actividad(etiqueta, actividad_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE rol (
    rol_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    rol VARCHAR(64) UNIQUE NOT NULL,
    descripcion LONGTEXT,
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE rol_actividad_permiso (
    rol_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (rol_id) REFERENCES rol(rol_id) ON DELETE CASCADE,
    actividad_permiso_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (actividad_permiso_id) REFERENCES actividad_permiso(actividad_permiso_id) ON DELETE CASCADE,
    PRIMARY KEY (actividad_permiso_id, rol_id),
    KEY por_rol(rol_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE rol_usuario (
    rol_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (rol_id) REFERENCES rol(rol_id) ON DELETE CASCADE,
    usuario_id MEDIUMINT UNSIGNED,
    PRIMARY KEY (usuario_id, rol_id),
    KEY por_rol(rol_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

