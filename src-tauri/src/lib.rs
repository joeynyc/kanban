mod commands;
mod db;

#[cfg(test)]
mod integration_tests;

use db::Database;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("kanban.db");

            // Create backup on startup if database exists
            if db_path.exists() {
                let backups_dir = app_dir.join("backups");
                std::fs::create_dir_all(&backups_dir).ok();

                let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
                let backup_path = backups_dir.join(format!("kanban_startup_{}.db", timestamp));
                std::fs::copy(&db_path, &backup_path).ok();

                // Cleanup old backups (keep last 7)
                cleanup_old_backups(&backups_dir, 7);
            }

            let database = Database::new(&db_path)?;
            database.run_migrations()?;

            // Check database integrity
            database.with_connection(|conn| {
                let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
                if result != "ok" {
                    eprintln!("Database integrity check failed: {}", result);
                }
                Ok(())
            }).ok();

            app.manage(Arc::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::boards::get_all_boards,
            commands::boards::get_board,
            commands::boards::create_board,
            commands::boards::update_board,
            commands::boards::delete_board,
            commands::boards::set_last_opened_board,
            commands::columns::get_columns_for_board,
            commands::columns::create_column,
            commands::columns::update_column,
            commands::columns::delete_column,
            commands::columns::reorder_columns,
            commands::cards::get_cards_for_board,
            commands::cards::get_cards_for_column,
            commands::cards::create_card,
            commands::cards::update_card,
            commands::cards::delete_card,
            commands::cards::move_card,
            commands::cards::batch_update_card_orders,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::cleanup_old_backups,
            commands::backup::check_database_integrity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn cleanup_old_backups(backups_dir: &std::path::Path, keep_count: usize) {
    if let Ok(entries) = std::fs::read_dir(backups_dir) {
        let mut backups: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "db"))
            .collect();

        // Sort by name descending (newest first)
        backups.sort_by(|a, b| b.file_name().cmp(&a.file_name()));

        // Delete old backups
        for backup in backups.into_iter().skip(keep_count) {
            let _ = std::fs::remove_file(backup.path());
        }
    }
}
