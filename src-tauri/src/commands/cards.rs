use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub column_id: String,
    pub title: String,
    pub description: Option<String>,
    pub order: f64,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardInput {
    pub column_id: String,
    pub title: String,
    pub description: Option<String>,
    pub order: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCardInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub order: Option<f64>,
    pub archived: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveCardInput {
    pub column_id: String,
    pub order: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpdateOrderInput {
    pub id: String,
    pub order: f64,
}

#[tauri::command]
pub fn get_cards_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<Card>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT c.id, c.column_id, c.title, c.description, c."order", c.archived, c.created_at, c.updated_at
               FROM cards c
               INNER JOIN columns col ON c.column_id = col.id
               WHERE col.board_id = ? AND c.archived = 0
               ORDER BY c."order" ASC"#,
        )?;

        let cards = stmt
            .query_map([&board_id], |row| {
                Ok(Card {
                    id: row.get(0)?,
                    column_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    order: row.get(4)?,
                    archived: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(cards)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cards_for_column(
    db: tauri::State<'_, Arc<Database>>,
    column_id: String,
) -> Result<Vec<Card>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at
               FROM cards
               WHERE column_id = ? AND archived = 0
               ORDER BY "order" ASC"#,
        )?;

        let cards = stmt
            .query_map([&column_id], |row| {
                Ok(Card {
                    id: row.get(0)?,
                    column_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    order: row.get(4)?,
                    archived: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(cards)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_card(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateCardInput,
) -> Result<Card, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Get the max order for this column if order not provided
    let order = if let Some(o) = input.order {
        o
    } else {
        db.with_connection(|conn| {
            let max_order: Option<f64> = conn.query_row(
                r#"SELECT MAX("order") FROM cards WHERE column_id = ?"#,
                [&input.column_id],
                |row| row.get(0),
            )?;
            Ok(max_order.unwrap_or(0.0) + 1.0)
        })
        .map_err(|e| e.to_string())?
    };

    let card = Card {
        id: id.clone(),
        column_id: input.column_id,
        title: input.title,
        description: input.description,
        order,
        archived: false,
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
            rusqlite::params![
                &card.id,
                &card.column_id,
                &card.title,
                &card.description,
                &card.order,
                card.archived as i32,
                &card.created_at,
                &card.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(card)
}

#[tauri::command]
pub fn update_card(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateCardInput,
) -> Result<Card, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        // Build dynamic update query
        let mut updates = vec!["updated_at = ?"];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];

        if let Some(title) = &input.title {
            updates.push("title = ?");
            params.push(Box::new(title.clone()));
        }
        if let Some(description) = &input.description {
            updates.push("description = ?");
            params.push(Box::new(description.clone()));
        }
        if let Some(order) = input.order {
            updates.push(r#""order" = ?"#);
            params.push(Box::new(order));
        }
        if let Some(archived) = input.archived {
            updates.push("archived = ?");
            params.push(Box::new(archived as i32));
        }

        params.push(Box::new(id.clone()));

        let query = format!(
            "UPDATE cards SET {} WHERE id = ?",
            updates.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;

        // Fetch updated card
        let mut stmt = conn.prepare(
            r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at
               FROM cards WHERE id = ?"#,
        )?;

        stmt.query_row([&id], |row| {
            Ok(Card {
                id: row.get(0)?,
                column_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                order: row.get(4)?,
                archived: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_card(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM cards WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_card(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: MoveCardInput,
) -> Result<Card, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        conn.execute(
            r#"UPDATE cards SET column_id = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
            rusqlite::params![&input.column_id, input.order, &now, &id],
        )?;

        // Fetch updated card
        let mut stmt = conn.prepare(
            r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at
               FROM cards WHERE id = ?"#,
        )?;

        stmt.query_row([&id], |row| {
            Ok(Card {
                id: row.get(0)?,
                column_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                order: row.get(4)?,
                archived: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn batch_update_card_orders(
    db: tauri::State<'_, Arc<Database>>,
    updates: Vec<BatchUpdateOrderInput>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        for update in &updates {
            conn.execute(
                r#"UPDATE cards SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![update.order, &now, &update.id],
            )?;
        }
        Ok(())
    })
    .map_err(|e| e.to_string())
}
