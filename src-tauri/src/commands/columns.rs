use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub order: f64,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateColumnInput {
    pub board_id: String,
    pub name: String,
    pub order: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateColumnInput {
    pub name: Option<String>,
    pub order: Option<f64>,
    pub archived: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderColumnInput {
    pub id: String,
    pub order: f64,
}

#[tauri::command]
pub fn get_columns_for_board(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<Vec<Column>, String> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, board_id, name, "order", archived, created_at, updated_at
               FROM columns
               WHERE board_id = ? AND archived = 0
               ORDER BY "order" ASC"#,
        )?;

        let columns = stmt
            .query_map([&board_id], |row| {
                Ok(Column {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(columns)
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_column(
    db: tauri::State<'_, Arc<Database>>,
    input: CreateColumnInput,
) -> Result<Column, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Get the max order for this board if order not provided
    let order = if let Some(o) = input.order {
        o
    } else {
        db.with_connection(|conn| {
            let max_order: Option<f64> = conn.query_row(
                r#"SELECT MAX("order") FROM columns WHERE board_id = ?"#,
                [&input.board_id],
                |row| row.get(0),
            )?;
            Ok(max_order.unwrap_or(0.0) + 1.0)
        })
        .map_err(|e| e.to_string())?
    };

    let column = Column {
        id: id.clone(),
        board_id: input.board_id,
        name: input.name,
        order,
        archived: false,
        created_at: now.clone(),
        updated_at: now,
    };

    db.with_connection(|conn| {
        conn.execute(
            r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)"#,
            rusqlite::params![
                &column.id,
                &column.board_id,
                &column.name,
                &column.order,
                column.archived as i32,
                &column.created_at,
                &column.updated_at
            ],
        )?;
        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(column)
}

#[tauri::command]
pub fn update_column(
    db: tauri::State<'_, Arc<Database>>,
    id: String,
    input: UpdateColumnInput,
) -> Result<Column, String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        // Build dynamic update query
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
        if let Some(archived) = input.archived {
            updates.push("archived = ?");
            params.push(Box::new(archived as i32));
        }

        params.push(Box::new(id.clone()));

        let query = format!(
            "UPDATE columns SET {} WHERE id = ?",
            updates.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, params_refs.as_slice())?;

        // Fetch updated column
        let mut stmt = conn.prepare(
            r#"SELECT id, board_id, name, "order", archived, created_at, updated_at
               FROM columns WHERE id = ?"#,
        )?;

        stmt.query_row([&id], |row| {
            Ok(Column {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                order: row.get(3)?,
                archived: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_column(db: tauri::State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM columns WHERE id = ?", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_columns(
    db: tauri::State<'_, Arc<Database>>,
    updates: Vec<ReorderColumnInput>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();

    db.with_connection(|conn| {
        for update in &updates {
            conn.execute(
                r#"UPDATE columns SET "order" = ?, updated_at = ? WHERE id = ?"#,
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
    fn test_create_column() {
        let (db, _temp) = create_test_db();

        // Create board first
        let board_id = db.with_connection(|conn| {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&id, "Board", &now, &now, &now],
            )?;
            Ok(id)
        }).unwrap();

        // Create column
        let result = db.with_connection(|conn| {
            let id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            let order = 1.0;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&id, &board_id, "To Do", order, 0, &now, &now],
            )?;

            Ok((id, order))
        });

        assert!(result.is_ok());
        let (_, order) = result.unwrap();
        assert_eq!(order, 1.0);
    }

    #[test]
    fn test_delete_column() {
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

        // Delete column
        let delete_result = db.with_connection(|conn| {
            conn.execute("DELETE FROM columns WHERE id = ?", [&col_id])
        });

        assert!(delete_result.is_ok());

        // Verify it's gone
        let count = db.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM columns WHERE board_id = ?")?;
            stmt.query_row([&board_id], |row| row.get::<_, i32>(0))
        }).unwrap();

        assert_eq!(count, 0);
    }

    #[test]
    fn test_update_column() {
        let (db, _temp) = create_test_db();

        // Create board and column
        let (_board_id, col_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col_id, &board_id, "Original Name", 1.0, 0, &now, &now],
            )?;

            Ok((board_id, col_id))
        }).unwrap();

        // Update column
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE columns SET name = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params!["Updated Name", 2.0, &now, &col_id],
            )?;

            let mut stmt = conn.prepare(
                r#"SELECT id, board_id, name, "order", archived, created_at, updated_at FROM columns WHERE id = ?"#,
            )?;

            stmt.query_row([&col_id], |row| {
                Ok(Column {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
        });

        assert!(result.is_ok());
        let updated = result.unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.order, 2.0);
    }

    #[test]
    fn test_reorder_columns() {
        let (db, _temp) = create_test_db();

        // Create board and columns
        let (board_id, col1_id, col2_id, col3_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col1_id = Uuid::new_v4().to_string();
            let col2_id = Uuid::new_v4().to_string();
            let col3_id = Uuid::new_v4().to_string();
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
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col3_id, &board_id, "Column 3", 3.0, 0, &now, &now],
            )?;

            Ok((board_id, col1_id, col2_id, col3_id))
        }).unwrap();

        // Reorder columns (reverse order)
        let result = db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE columns SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![3.0, &now, &col1_id],
            )?;
            conn.execute(
                r#"UPDATE columns SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![2.0, &now, &col2_id],
            )?;
            conn.execute(
                r#"UPDATE columns SET "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![1.0, &now, &col3_id],
            )?;
            Ok(())
        });

        assert!(result.is_ok());

        // Verify new order
        let columns = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"SELECT id, board_id, name, "order", archived, created_at, updated_at
                   FROM columns
                   WHERE board_id = ? AND archived = 0
                   ORDER BY "order" ASC"#,
            )?;

            let columns = stmt
                .query_map([&board_id], |row| {
                    Ok(Column {
                        id: row.get(0)?,
                        board_id: row.get(1)?,
                        name: row.get(2)?,
                        order: row.get(3)?,
                        archived: row.get::<_, i32>(4)? != 0,
                        created_at: row.get(5)?,
                        updated_at: row.get(6)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(columns)
        }).unwrap();

        assert_eq!(columns.len(), 3);
        assert_eq!(columns[0].id, col3_id);
        assert_eq!(columns[1].id, col2_id);
        assert_eq!(columns[2].id, col1_id);
    }

    #[test]
    fn test_get_columns_for_board() {
        let (db, _temp) = create_test_db();

        // Create board and columns
        let board_id = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "Board", &now, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &board_id, "To Do", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &board_id, "In Progress", 2.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![Uuid::new_v4().to_string(), &board_id, "Done", 3.0, 0, &now, &now],
            )?;

            Ok(board_id)
        }).unwrap();

        // Get all columns
        let columns = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"SELECT id, board_id, name, "order", archived, created_at, updated_at
                   FROM columns
                   WHERE board_id = ? AND archived = 0
                   ORDER BY "order" ASC"#,
            )?;

            let columns = stmt
                .query_map([&board_id], |row| {
                    Ok(Column {
                        id: row.get(0)?,
                        board_id: row.get(1)?,
                        name: row.get(2)?,
                        order: row.get(3)?,
                        archived: row.get::<_, i32>(4)? != 0,
                        created_at: row.get(5)?,
                        updated_at: row.get(6)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(columns)
        }).unwrap();

        assert_eq!(columns.len(), 3);
        assert_eq!(columns[0].name, "To Do");
        assert_eq!(columns[1].name, "In Progress");
        assert_eq!(columns[2].name, "Done");
        // Verify they're ordered correctly
        assert!(columns[0].order < columns[1].order);
        assert!(columns[1].order < columns[2].order);
    }
}
