use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Label {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLabelInput {
    pub board_id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLabelInput {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CardLabelMapping {
    pub card_id: String,
    pub label_id: String,
}

#[tauri::command]
pub fn get_labels_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<Label>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, board_id, name, color, created_at, updated_at FROM labels WHERE board_id = ? ORDER BY name ASC",
        )?;

        let labels = stmt
            .query_map([&board_id], |row| {
                Ok(Label {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(labels)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_label(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateLabelInput,
) -> Result<Label, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let label = Label {
        id: id.clone(),
        board_id: input.board_id,
        name: input.name,
        color: input.color,
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            "INSERT INTO labels (id, board_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                &label.id,
                &label.board_id,
                &label.name,
                &label.color,
                &label.created_at,
                &label.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(label)
}

#[tauri::command]
pub fn update_label(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateLabelInput,
) -> Result<Label, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        let mut updates = vec!["updated_at = ?"];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(Box::new(name.clone()));
        }
        if let Some(color) = &input.color {
            updates.push("color = ?");
            params.push(Box::new(color.clone()));
        }

        params.push(Box::new(id.clone()));

        let query = format!("UPDATE labels SET {} WHERE id = ?", updates.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;

        let mut stmt = conn.prepare(
            "SELECT id, board_id, name, color, created_at, updated_at FROM labels WHERE id = ?",
        )?;

        stmt.query_row([&id], |row| {
            Ok(Label {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_label(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM labels WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_label_to_card(
    db: tauri::State<'_, Arc<Database>>,
    card_id: String,
    label_id: String,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        conn.execute(
            "INSERT OR IGNORE INTO card_labels (card_id, label_id, created_at) VALUES (?, ?, ?)",
            rusqlite::params![&card_id, &label_id, &now],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_label_from_card(
    db: tauri::State<'_, Arc<Database>>,
    card_id: String,
    label_id: String,
) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute(
            "DELETE FROM card_labels WHERE card_id = ? AND label_id = ?",
            rusqlite::params![&card_id, &label_id],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_labels_for_card(
    db: tauri::State<'_, Arc<Database>>,
    card_id: String,
) -> Result<Vec<Label>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT l.id, l.board_id, l.name, l.color, l.created_at, l.updated_at
             FROM labels l
             INNER JOIN card_labels cl ON l.id = cl.label_id
             WHERE cl.card_id = ?
             ORDER BY l.name ASC",
        )?;

        let labels = stmt
            .query_map([&card_id], |row| {
                Ok(Label {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(labels)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_card_labels_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<CardLabelMapping>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT cl.card_id, cl.label_id
             FROM card_labels cl
             INNER JOIN cards c ON cl.card_id = c.id
             INNER JOIN columns col ON c.column_id = col.id
             WHERE col.board_id = ?",
        )?;

        let mappings = stmt
            .query_map([&board_id], |row| {
                Ok(CardLabelMapping {
                    card_id: row.get(0)?,
                    label_id: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(mappings)
    })
    .map_err(|e| e.to_string())
}
