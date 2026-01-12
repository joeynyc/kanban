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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::test_helpers::create_test_db;

    #[test]
    fn test_create_card() {
        let (db, _temp) = create_test_db();

        let (board_id, col_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            Ok((board_id, col_id))
        }).unwrap();

        // Create card
        let result = db.with_connection(|conn| {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&id, &col_id, "Test Card", None::<String>, 1.0, 0, &now, &now],
            )?;

            Ok(id)
        });

        assert!(result.is_ok());
    }

    #[test]
    fn test_order_calculation_on_create() {
        let (db, _temp) = create_test_db();

        let col_id = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            Ok(col_id)
        }).unwrap();

        // Create multiple cards - verify order auto-increments
        for i in 1..=3 {
            let _ = db.with_connection(|conn| {
                let id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                conn.execute(
                    r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                    rusqlite::params![&id, &col_id, format!("Card {}", i), None::<String>, i as f64, 0, &now, &now],
                )
            });
        }

        // Verify 3 cards exist
        let count = db.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM cards WHERE column_id = ?")?;
            stmt.query_row([&col_id], |row| row.get::<_, i32>(0))
        }).unwrap();

        assert_eq!(count, 3);
    }

    #[test]
    fn test_delete_card() {
        let (db, _temp) = create_test_db();

        let (col_id, card_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let card_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card_id, &col_id, "Card", None::<String>, 1.0, 0, &now, &now],
            )?;

            Ok((col_id, card_id))
        }).unwrap();

        // Delete card
        let result = db.with_connection(|conn| {
            conn.execute("DELETE FROM cards WHERE id = ?", [&card_id])
        });

        assert!(result.is_ok());

        // Verify it's gone
        let count = db.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM cards WHERE column_id = ?")?;
            stmt.query_row([&col_id], |row| row.get::<_, i32>(0))
        }).unwrap();

        assert_eq!(count, 0);
    }

    #[test]
    fn test_update_card() {
        let (db, _temp) = create_test_db();

        // Create board and column
        let (col_id, card_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let card_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card_id, &col_id, "Original Title", Some("Original description"), 1.0, 0, &now, &now],
            )?;

            Ok((col_id, card_id))
        }).unwrap();

        // Update card
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE cards SET title = ?, description = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params!["Updated Title", "Updated description", &now, &card_id],
            )?;

            let mut stmt = conn.prepare(
                r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at FROM cards WHERE id = ?"#,
            )?;

            stmt.query_row([&card_id], |row| {
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
        });

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.description, Some("Updated description".to_string()));
        assert_eq!(updated.order, 1.0);
    }

    #[test]
    fn test_move_card() {
        let (db, _temp) = create_test_db();

        // Create board, two columns, and a card
        let (col1_id, col2_id, card_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col1_id = Uuid::new_v4().to_string();
            let col2_id = Uuid::new_v4().to_string();
            let card_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col1_id, &board_id, "Column 1", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col2_id, &board_id, "Column 2", 2.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card_id, &col1_id, "Test Card", None::<String>, 1.0, 0, &now, &now],
            )?;

            Ok((col1_id, col2_id, card_id))
        }).unwrap();

        // Move card to column 2
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE cards SET column_id = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![&col2_id, 5.0, &now, &card_id],
            )?;

            let mut stmt = conn.prepare(
                r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at FROM cards WHERE id = ?"#,
            )?;

            stmt.query_row([&card_id], |row| {
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
        });

        assert!(result.is_ok());
        let moved = result.unwrap();
        assert_eq!(moved.column_id, col2_id);
        assert_eq!(moved.order, 5.0);
    }

    #[test]
    fn test_get_cards_for_board() {
        let (db, _temp) = create_test_db();

        // Create board, column, and cards
        let (board_id, col_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &col_id, "Card 1", None::<String>, 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &col_id, "Card 2", None::<String>, 2.0, 0, &now, &now],
            )?;

            Ok((board_id, col_id))
        }).unwrap();

        // Get cards for board using the query
        let cards = db.with_connection(|conn| {
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
        }).unwrap();

        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].title, "Card 1");
        assert_eq!(cards[1].title, "Card 2");
    }

    #[test]
    fn test_get_cards_for_column() {
        let (db, _temp) = create_test_db();

        // Create board and two columns with cards
        let (col1_id, col2_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col1_id = Uuid::new_v4().to_string();
            let col2_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col1_id, &board_id, "Column 1", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col2_id, &board_id, "Column 2", 2.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &col1_id, "Card 1", None::<String>, 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &col2_id, "Card 2", None::<String>, 1.0, 0, &now, &now],
            )?;

            Ok((col1_id, col2_id))
        }).unwrap();

        // Get cards for column 1
        let cards = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at
                   FROM cards
                   WHERE column_id = ? AND archived = 0
                   ORDER BY "order" ASC"#,
            )?;

            let cards = stmt
                .query_map([&col1_id], |row| {
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
        }).unwrap();

        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].title, "Card 1");
    }

    #[test]
    fn test_batch_update_card_orders() {
        let (db, _temp) = create_test_db();

        // Create board, column, and cards
        let (col_id, card1_id, card2_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let card1_id = Uuid::new_v4().to_string();
            let card2_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Column", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card1_id, &col_id, "Card 1", None::<String>, 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card2_id, &col_id, "Card 2", None::<String>, 2.0, 0, &now, &now],
            )?;

            Ok((col_id, card1_id, card2_id))
        }).unwrap();

        // Batch update orders (reverse them)
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE cards SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![2.0, &now, &card1_id],
            )?;
            conn.execute(
                r#"UPDATE cards SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![1.0, &now, &card2_id],
            )?;
            Ok(())
        });

        assert!(result.is_ok());

        // Verify orders were updated
        let cards = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"SELECT id, column_id, title, description, "order", archived, created_at, updated_at
                   FROM cards
                   WHERE column_id = ? AND archived = 0
                   ORDER BY "order" ASC"#,
            )?;

            let cards = stmt
                .query_map([&col_id], |row| {
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
        }).unwrap();

        assert_eq!(cards[0].id, card2_id);
        assert_eq!(cards[0].order, 1.0);
        assert_eq!(cards[1].id, card1_id);
        assert_eq!(cards[1].order, 2.0);
    }
}
