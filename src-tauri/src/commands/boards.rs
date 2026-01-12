use crate::db::Database;
use chrono::Utc;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Board {
    pub id: String,
    pub name: String,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBoardInput {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBoardInput {
    pub name: Option<String>,
}

#[tauri::command]
pub fn get_all_boards(db: tauri::State<'_, Arc<Database>>) -> Result<Vec<Board>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, name, last_opened_at, created_at, updated_at
               FROM boards
               ORDER BY last_opened_at DESC NULLS LAST, created_at DESC"#,
        )?;

        let boards = stmt
            .query_map([], |row| {
                Ok(Board {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    last_opened_at: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(boards)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_board(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<Option<Board>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, last_opened_at, created_at, updated_at FROM boards WHERE id = ?",
        )?;

        let board = stmt
            .query_row([&id], |row| {
                Ok(Board {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    last_opened_at: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })
            .optional()?;

        Ok(board)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_board(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateBoardInput,
) -> Result<Board, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let board = Board {
        id: id.clone(),
        name: input.name,
        last_opened_at: Some(now.clone()),
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![
                &board.id,
                &board.name,
                &board.last_opened_at,
                &board.created_at,
                &board.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(board)
}

#[tauri::command]
pub fn update_board(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateBoardInput,
) -> Result<Board, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        if let Some(name) = &input.name {
            conn.execute(
                "UPDATE boards SET name = ?, updated_at = ? WHERE id = ?",
                rusqlite::params![name, &now, &id],
            )?;
        }

        let mut stmt = conn.prepare(
            "SELECT id, name, last_opened_at, created_at, updated_at FROM boards WHERE id = ?",
        )?;

        stmt.query_row([&id], |row| {
            Ok(Board {
                id: row.get(0)?,
                name: row.get(1)?,
                last_opened_at: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_board(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM boards WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_last_opened_board(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        conn.execute(
            "UPDATE boards SET last_opened_at = ? WHERE id = ?",
            rusqlite::params![&now, &id],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::test_helpers::create_test_db;

    #[test]
    fn test_create_board() {
        let (db, _temp) = create_test_db();

        let result = db.with_connection(|conn| {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            let board = Board {
                id: id.clone(),
                name: "Test Board".to_string(),
                last_opened_at: Some(now.clone()),
                created_at: now.clone(),
                updated_at: now,
            };

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board.id, &board.name, &board.last_opened_at, &board.created_at, &board.updated_at],
            )?;

            Ok(board)
        });

        assert!(result.is_ok());
        let board = result.unwrap();
        assert_eq!(board.name, "Test Board");
        assert!(board.last_opened_at.is_some());
        assert!(!board.id.is_empty());
    }

    #[test]
    fn test_get_all_boards() {
        let (db, _temp) = create_test_db();

        // Create multiple boards
        for name in &["Board 1", "Board 2", "Board 3"] {
            let _ = db.with_connection(|conn| {
                let id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                conn.execute(
                    "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    rusqlite::params![&id, &name, &now, &now, &now],
                )
            });
        }

        let count = db.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM boards")?;
            stmt.query_row([], |row| row.get::<_, i32>(0))
        });

        assert!(count.is_ok());
        assert_eq!(count.unwrap(), 3);
    }

    #[test]
    fn test_update_board() {
        let (db, _temp) = create_test_db();

        // Create board
        let board_id = db.with_connection(|conn| {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&id, "Original", &now, &now, &now],
            )?;
            Ok(id)
        }).unwrap();

        // Update board
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE boards SET name = ?, updated_at = ? WHERE id = ?",
                rusqlite::params!["Updated", &now, &board_id],
            )?;

            let mut stmt = conn.prepare(
                "SELECT id, name, last_opened_at, created_at, updated_at FROM boards WHERE id = ?",
            )?;

            stmt.query_row([&board_id], |row| {
                Ok(Board {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    last_opened_at: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })
        });

        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "Updated");
    }

    #[test]
    fn test_delete_board_cascades() {
        let (db, _temp) = create_test_db();

        // Create board, column, and card
        let (board_id, col_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let card_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            // Insert board
            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Test", &now, &now, &now],
            )?;

            // Insert column
            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "To Do", 1.0, 0, &now, &now],
            )?;

            // Insert card
            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card_id, &col_id, "Test Card", None::<String>, 1.0, 0, &now, &now],
            )?;

            Ok((board_id, col_id))
        }).unwrap();

        // Verify data exists
        let cols_before = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"SELECT COUNT(*) FROM columns WHERE board_id = ?"#,
            )?;
            stmt.query_row([&board_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(cols_before, 1);

        // Delete board
        let _ = db.with_connection(|conn| {
            conn.execute("DELETE FROM boards WHERE id = ?", [&board_id])
        });

        // Verify board is gone
        let board_exists = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM boards WHERE id = ?",
            )?;
            stmt.query_row([&board_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(board_exists, 0);
    }
}
