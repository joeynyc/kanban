use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Checklist {
    pub id: String,
    pub card_id: String,
    pub name: String,
    pub order: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChecklistInput {
    pub card_id: String,
    pub name: String,
    pub order: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChecklistInput {
    pub name: Option<String>,
    pub order: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub id: String,
    pub checklist_id: String,
    pub text: String,
    pub checked: bool,
    pub order: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChecklistItemInput {
    pub checklist_id: String,
    pub text: String,
    pub order: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChecklistItemInput {
    pub text: Option<String>,
    pub checked: Option<bool>,
    pub order: Option<f64>,
}

#[tauri::command]
pub fn get_checklists_for_card(
    db: tauri::State<'_, Arc<Database>>,
    card_id: String,
) -> Result<Vec<Checklist>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, card_id, name, "order", created_at, updated_at
               FROM checklists WHERE card_id = ? ORDER BY "order" ASC"#,
        )?;

        let checklists = stmt
            .query_map([&card_id], |row| {
                Ok(Checklist {
                    id: row.get(0)?,
                    card_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(checklists)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_checklists_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<Checklist>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT cl.id, cl.card_id, cl.name, cl."order", cl.created_at, cl.updated_at
               FROM checklists cl
               INNER JOIN cards c ON cl.card_id = c.id
               INNER JOIN columns col ON c.column_id = col.id
               WHERE col.board_id = ?
               ORDER BY cl."order" ASC"#,
        )?;

        let checklists = stmt
            .query_map([&board_id], |row| {
                Ok(Checklist {
                    id: row.get(0)?,
                    card_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(checklists)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_checklist(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateChecklistInput,
) -> Result<Checklist, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let order = if let Some(o) = input.order {
        o
    } else {
        db.with_connection(|conn| {
            let max_order: Option<f64> = conn.query_row(
                r#"SELECT MAX("order") FROM checklists WHERE card_id = ?"#,
                [&input.card_id],
                |row| row.get(0),
            )?;
            Ok(max_order.unwrap_or(0.0) + 1.0)
        })
        .map_err(|e| e.to_string())?
    };

    let checklist = Checklist {
        id: id.clone(),
        card_id: input.card_id,
        name: input.name,
        order,
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            r#"INSERT INTO checklists (id, card_id, name, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"#,
            rusqlite::params![
                &checklist.id,
                &checklist.card_id,
                &checklist.name,
                &checklist.order,
                &checklist.created_at,
                &checklist.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(checklist)
}

#[tauri::command]
pub fn update_checklist(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateChecklistInput,
) -> Result<Checklist, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        let mut updates = vec!["updated_at = ?"];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];

        if let Some(name) = &input.name {
            updates.push("name = ?");
            params.push(Box::new(name.clone()));
        }
        if let Some(order) = input.order {
            updates.push(r#""order" = ?"#);
            params.push(Box::new(order));
        }

        params.push(Box::new(id.clone()));

        let query = format!("UPDATE checklists SET {} WHERE id = ?", updates.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;

        let mut stmt = conn.prepare(
            r#"SELECT id, card_id, name, "order", created_at, updated_at FROM checklists WHERE id = ?"#,
        )?;

        stmt.query_row([&id], |row| {
            Ok(Checklist {
                id: row.get(0)?,
                card_id: row.get(1)?,
                name: row.get(2)?,
                order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_checklist(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM checklists WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_checklist_items_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<ChecklistItem>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT ci.id, ci.checklist_id, ci.text, ci.checked, ci."order", ci.created_at, ci.updated_at
               FROM checklist_items ci
               INNER JOIN checklists cl ON ci.checklist_id = cl.id
               INNER JOIN cards c ON cl.card_id = c.id
               INNER JOIN columns col ON c.column_id = col.id
               WHERE col.board_id = ?
               ORDER BY ci."order" ASC"#,
        )?;

        let items = stmt
            .query_map([&board_id], |row| {
                Ok(ChecklistItem {
                    id: row.get(0)?,
                    checklist_id: row.get(1)?,
                    text: row.get(2)?,
                    checked: row.get::<_, i32>(3)? != 0,
                    order: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_checklist_item(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateChecklistItemInput,
) -> Result<ChecklistItem, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let order = if let Some(o) = input.order {
        o
    } else {
        db.with_connection(|conn| {
            let max_order: Option<f64> = conn.query_row(
                r#"SELECT MAX("order") FROM checklist_items WHERE checklist_id = ?"#,
                [&input.checklist_id],
                |row| row.get(0),
            )?;
            Ok(max_order.unwrap_or(0.0) + 1.0)
        })
        .map_err(|e| e.to_string())?
    };

    let item = ChecklistItem {
        id: id.clone(),
        checklist_id: input.checklist_id,
        text: input.text,
        checked: false,
        order,
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            r#"INSERT INTO checklist_items (id, checklist_id, text, checked, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
            rusqlite::params![
                &item.id,
                &item.checklist_id,
                &item.text,
                item.checked as i32,
                &item.order,
                &item.created_at,
                &item.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn update_checklist_item(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateChecklistItemInput,
) -> Result<ChecklistItem, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        let mut updates = vec!["updated_at = ?"];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];

        if let Some(text) = &input.text {
            updates.push("text = ?");
            params.push(Box::new(text.clone()));
        }
        if let Some(checked) = input.checked {
            updates.push("checked = ?");
            params.push(Box::new(checked as i32));
        }
        if let Some(order) = input.order {
            updates.push(r#""order" = ?"#);
            params.push(Box::new(order));
        }

        params.push(Box::new(id.clone()));

        let query = format!("UPDATE checklist_items SET {} WHERE id = ?", updates.join(", "));
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;

        let mut stmt = conn.prepare(
            r#"SELECT id, checklist_id, text, checked, "order", created_at, updated_at FROM checklist_items WHERE id = ?"#,
        )?;

        stmt.query_row([&id], |row| {
            Ok(ChecklistItem {
                id: row.get(0)?,
                checklist_id: row.get(1)?,
                text: row.get(2)?,
                checked: row.get::<_, i32>(3)? != 0,
                order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_checklist_item(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM checklist_items WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_checklist_items_for_checklist(
    db: tauri::State<'_, Arc<Database>>,
    checklist_id: String,
) -> Result<Vec<ChecklistItem>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, checklist_id, text, checked, "order", created_at, updated_at
               FROM checklist_items WHERE checklist_id = ? ORDER BY "order" ASC"#,
        )?;

        let items = stmt
            .query_map([&checklist_id], |row| {
                Ok(ChecklistItem {
                    id: row.get(0)?,
                    checklist_id: row.get(1)?,
                    text: row.get(2)?,
                    checked: row.get::<_, i32>(3)? != 0,
                    order: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    })
    .map_err(|e| e.to_string())
}
