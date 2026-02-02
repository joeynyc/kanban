use rusqlite::{Connection, Result};

const MIGRATIONS: &[(&str, &str)] = &[
    ("001_initial_schema", r#"
        -- Boards table
        CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            last_opened_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- Columns table
        CREATE TABLE IF NOT EXISTS columns (
            id TEXT PRIMARY KEY NOT NULL,
            board_id TEXT NOT NULL,
            name TEXT NOT NULL,
            "order" REAL NOT NULL,
            archived INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );

        -- Cards table
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY NOT NULL,
            column_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            "order" REAL NOT NULL,
            archived INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id, "order");
        CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, "order");
        CREATE INDEX IF NOT EXISTS idx_boards_last_opened ON boards(last_opened_at);
    "#),
    ("002_labels", r#"
        -- Labels table (board-scoped)
        CREATE TABLE IF NOT EXISTS labels (
            id TEXT PRIMARY KEY NOT NULL,
            board_id TEXT NOT NULL,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );

        -- Card-label junction table (many-to-many)
        CREATE TABLE IF NOT EXISTS card_labels (
            card_id TEXT NOT NULL,
            label_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (card_id, label_id),
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);
        CREATE INDEX IF NOT EXISTS idx_card_labels_card ON card_labels(card_id);
        CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);
    "#),
    ("003_due_dates_priorities", r#"
        ALTER TABLE cards ADD COLUMN due_date TEXT;
        ALTER TABLE cards ADD COLUMN priority TEXT DEFAULT 'none';
        CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
        CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(priority);
    "#),
    ("004_checklists", r#"
        -- Checklists table
        CREATE TABLE IF NOT EXISTS checklists (
            id TEXT PRIMARY KEY NOT NULL,
            card_id TEXT NOT NULL,
            name TEXT NOT NULL,
            "order" REAL NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        );

        -- Checklist items table
        CREATE TABLE IF NOT EXISTS checklist_items (
            id TEXT PRIMARY KEY NOT NULL,
            checklist_id TEXT NOT NULL,
            text TEXT NOT NULL,
            checked INTEGER DEFAULT 0,
            "order" REAL NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_checklists_card ON checklists(card_id, "order");
        CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id, "order");
    "#),
];

pub fn run_migrations(conn: &Connection) -> Result<()> {
    // Create migrations table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        )",
        [],
    )?;

    // Run each migration if not already applied
    for (name, sql) in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM _migrations WHERE name = ?)",
            [name],
            |row| row.get(0),
        )?;

        if !already_applied {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO _migrations (name, applied_at) VALUES (?, datetime('now'))",
                [name],
            )?;
            println!("Applied migration: {}", name);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::test_helpers::create_test_db;

    #[test]
    fn test_migrations_run_successfully() {
        let (db, _temp) = create_test_db();

        // Verify tables were created
        let tables = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )?;

            let table_names = stmt
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(table_names)
        }).unwrap();

        assert!(tables.contains(&"boards".to_string()));
        assert!(tables.contains(&"columns".to_string()));
        assert!(tables.contains(&"cards".to_string()));
        assert!(tables.contains(&"labels".to_string()));
        assert!(tables.contains(&"card_labels".to_string()));
        assert!(tables.contains(&"checklists".to_string()));
        assert!(tables.contains(&"checklist_items".to_string()));
        assert!(tables.contains(&"_migrations".to_string()));

        // Verify migration was recorded
        let migration_count = db.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM _migrations")?;
            stmt.query_row([], |row| row.get::<_, i32>(0))
        }).unwrap();

        assert_eq!(migration_count, 4);
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let (db, _temp) = create_test_db();

        // Verify foreign keys are enabled
        let fk_enabled = db.with_connection(|conn| {
            let mut stmt = conn.prepare("PRAGMA foreign_keys")?;
            stmt.query_row([], |row| row.get::<_, i32>(0))
        }).unwrap();

        assert_eq!(fk_enabled, 1);
    }

    #[test]
    fn test_indexes_created() {
        let (db, _temp) = create_test_db();

        // Verify indexes were created
        let indexes = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )?;

            let index_names = stmt
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(index_names)
        }).unwrap();

        assert!(indexes.contains(&"idx_columns_board".to_string()));
        assert!(indexes.contains(&"idx_cards_column".to_string()));
        assert!(indexes.contains(&"idx_boards_last_opened".to_string()));
        assert!(indexes.contains(&"idx_labels_board".to_string()));
        assert!(indexes.contains(&"idx_card_labels_card".to_string()));
        assert!(indexes.contains(&"idx_card_labels_label".to_string()));
        assert!(indexes.contains(&"idx_cards_due_date".to_string()));
        assert!(indexes.contains(&"idx_cards_priority".to_string()));
        assert!(indexes.contains(&"idx_checklists_card".to_string()));
        assert!(indexes.contains(&"idx_checklist_items_checklist".to_string()));
        assert_eq!(indexes.len(), 10);
    }
}
