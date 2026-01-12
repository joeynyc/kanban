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
