use chrono::Utc;
use std::fs;
use tauri::Manager;

/// Create a backup of the database
#[tauri::command]
pub fn create_backup(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("kanban.db");
    let backups_dir = app_dir.join("backups");

    // Create backups directory if it doesn't exist
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    // Generate backup filename with timestamp
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("kanban_backup_{}.db", timestamp);
    let backup_path = backups_dir.join(&backup_filename);

    // Copy database file
    if db_path.exists() {
        fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;

        // Also copy WAL and SHM files if they exist
        let wal_path = db_path.with_extension("db-wal");
        let shm_path = db_path.with_extension("db-shm");

        if wal_path.exists() {
            let _ = fs::copy(&wal_path, backup_path.with_extension("db-wal"));
        }
        if shm_path.exists() {
            let _ = fs::copy(&shm_path, backup_path.with_extension("db-shm"));
        }
    }

    Ok(backup_path.to_string_lossy().to_string())
}

/// List available backups
#[tauri::command]
pub fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let backups_dir = app_dir.join("backups");

    if !backups_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();

    for entry in fs::read_dir(&backups_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "db") {
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let size = metadata.len();

            backups.push(BackupInfo {
                filename,
                path: path.to_string_lossy().to_string(),
                size,
            });
        }
    }

    // Sort by filename (which includes timestamp) descending
    backups.sort_by(|a, b| b.filename.cmp(&a.filename));

    Ok(backups)
}

/// Clean up old backups, keeping only the most recent N
#[tauri::command]
pub fn cleanup_old_backups(app: tauri::AppHandle, keep_count: usize) -> Result<usize, String> {
    let backups = list_backups(app.clone())?;

    if backups.len() <= keep_count {
        return Ok(0);
    }

    let mut deleted = 0;
    for backup in backups.iter().skip(keep_count) {
        if fs::remove_file(&backup.path).is_ok() {
            deleted += 1;
            // Also remove WAL and SHM files
            let _ = fs::remove_file(format!("{}-wal", backup.path));
            let _ = fs::remove_file(format!("{}-shm", backup.path));
        }
    }

    Ok(deleted)
}

/// Check database integrity
#[tauri::command]
pub fn check_database_integrity(
    db: tauri::State<'_, std::sync::Arc<crate::db::Database>>,
) -> Result<bool, String> {
    db.with_connection(|conn| {
        let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
        Ok(result == "ok")
    })
    .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub size: u64,
}
