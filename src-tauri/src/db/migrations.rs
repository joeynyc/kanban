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
