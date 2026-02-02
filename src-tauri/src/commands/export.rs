use crate::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use super::boards::Board;
use super::cards::Card;
use super::checklists::{Checklist, ChecklistItem};
use super::columns::Column;
use super::labels::{CardLabelMapping, Label};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardExport {
    pub board: Board,
    pub columns: Vec<Column>,
    pub cards: Vec<Card>,
    pub labels: Vec<Label>,
    pub card_labels: Vec<CardLabelMapping>,
    pub checklists: Vec<Checklist>,
    pub checklist_items: Vec<ChecklistItem>,
}

#[tauri::command]
pub fn export_board_json(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<String, String> {
    let export = build_board_export(&db, &board_id)?;
    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_board_csv(
    db: tauri::State<'_, Arc<Database>>,
    board_id: String,
) -> Result<String, String> {
    let export = build_board_export(&db, &board_id)?;

    let mut csv = String::from("Title,Description,Column,Priority,Due Date,Labels,Checklist Progress,Created,Updated\n");

    for card in &export.cards {
        let column_name = export
            .columns
            .iter()
            .find(|c| c.id == card.column_id)
            .map(|c| c.name.clone())
            .unwrap_or_default();

        let label_names: Vec<String> = export
            .card_labels
            .iter()
            .filter(|cl| cl.card_id == card.id)
            .filter_map(|cl| export.labels.iter().find(|l| l.id == cl.label_id))
            .map(|l| l.name.clone())
            .collect();

        let checklist_progress = {
            let card_checklists: Vec<&Checklist> = export
                .checklists
                .iter()
                .filter(|cl| cl.card_id == card.id)
                .collect();

            if card_checklists.is_empty() {
                String::new()
            } else {
                let checklist_ids: Vec<&str> = card_checklists.iter().map(|cl| cl.id.as_str()).collect();
                let total: usize = export
                    .checklist_items
                    .iter()
                    .filter(|ci| checklist_ids.contains(&ci.checklist_id.as_str()))
                    .count();
                let checked: usize = export
                    .checklist_items
                    .iter()
                    .filter(|ci| checklist_ids.contains(&ci.checklist_id.as_str()) && ci.checked)
                    .count();
                format!("{}/{}", checked, total)
            }
        };

        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            csv_escape(&card.title),
            csv_escape(&card.description.clone().unwrap_or_default()),
            csv_escape(&column_name),
            csv_escape(&card.priority),
            csv_escape(&card.due_date.clone().unwrap_or_default()),
            csv_escape(&label_names.join("; ")),
            csv_escape(&checklist_progress),
            csv_escape(&card.created_at),
            csv_escape(&card.updated_at),
        ));
    }

    Ok(csv)
}

fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn build_board_export(
    db: &tauri::State<'_, Arc<Database>>,
    board_id: &str,
) -> Result<BoardExport, String> {
    db.with_connection(|conn| {
        // Board
        let board = {
            let mut stmt = conn.prepare(
                "SELECT id, name, last_opened_at, created_at, updated_at FROM boards WHERE id = ?",
            )?;
            stmt.query_row([board_id], |row| {
                Ok(Board {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    last_opened_at: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?
        };

        // Columns
        let columns = {
            let mut stmt = conn.prepare(
                r#"SELECT id, board_id, name, "order", archived, created_at, updated_at
                   FROM columns WHERE board_id = ? ORDER BY "order" ASC"#,
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(Column {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        // Cards
        let cards = {
            let mut stmt = conn.prepare(
                r#"SELECT c.id, c.column_id, c.title, c.description, c."order", c.archived, c.created_at, c.updated_at, c.due_date, c.priority
                   FROM cards c INNER JOIN columns col ON c.column_id = col.id
                   WHERE col.board_id = ? ORDER BY c."order" ASC"#,
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(Card {
                    id: row.get(0)?,
                    column_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    order: row.get(4)?,
                    archived: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    due_date: row.get(8)?,
                    priority: row.get::<_, Option<String>>(9)?.unwrap_or_else(|| "none".to_string()),
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        // Labels
        let labels = {
            let mut stmt = conn.prepare(
                "SELECT id, board_id, name, color, created_at, updated_at FROM labels WHERE board_id = ?",
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(Label {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        // Card labels
        let card_labels = {
            let mut stmt = conn.prepare(
                "SELECT cl.card_id, cl.label_id FROM card_labels cl
                 INNER JOIN cards c ON cl.card_id = c.id
                 INNER JOIN columns col ON c.column_id = col.id
                 WHERE col.board_id = ?",
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(CardLabelMapping {
                    card_id: row.get(0)?,
                    label_id: row.get(1)?,
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        // Checklists
        let checklists = {
            let mut stmt = conn.prepare(
                r#"SELECT cl.id, cl.card_id, cl.name, cl."order", cl.created_at, cl.updated_at
                   FROM checklists cl
                   INNER JOIN cards c ON cl.card_id = c.id
                   INNER JOIN columns col ON c.column_id = col.id
                   WHERE col.board_id = ? ORDER BY cl."order" ASC"#,
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(Checklist {
                    id: row.get(0)?,
                    card_id: row.get(1)?,
                    name: row.get(2)?,
                    order: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        // Checklist items
        let checklist_items = {
            let mut stmt = conn.prepare(
                r#"SELECT ci.id, ci.checklist_id, ci.text, ci.checked, ci."order", ci.created_at, ci.updated_at
                   FROM checklist_items ci
                   INNER JOIN checklists cl ON ci.checklist_id = cl.id
                   INNER JOIN cards c ON cl.card_id = c.id
                   INNER JOIN columns col ON c.column_id = col.id
                   WHERE col.board_id = ? ORDER BY ci."order" ASC"#,
            )?;
            let rows = stmt.query_map([board_id], |row| {
                Ok(ChecklistItem {
                    id: row.get(0)?,
                    checklist_id: row.get(1)?,
                    text: row.get(2)?,
                    checked: row.get::<_, i32>(3)? != 0,
                    order: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?;
            rows.collect::<Result<Vec<_>, _>>()?
        };

        Ok(BoardExport {
            board,
            columns,
            cards,
            labels,
            card_labels,
            checklists,
            checklist_items,
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_board_json(
    db: tauri::State<'_, Arc<Database>>,
    json_data: String,
) -> Result<Board, String> {
    let export: BoardExport =
        serde_json::from_str(&json_data).map_err(|e| format!("Invalid JSON: {}", e))?;

    let now = Utc::now().to_rfc3339();

    // Remap all IDs
    let new_board_id = Uuid::new_v4().to_string();
    let mut column_id_map = std::collections::HashMap::new();
    let mut card_id_map = std::collections::HashMap::new();
    let mut label_id_map = std::collections::HashMap::new();
    let mut checklist_id_map = std::collections::HashMap::new();

    for col in &export.columns {
        column_id_map.insert(col.id.clone(), Uuid::new_v4().to_string());
    }
    for card in &export.cards {
        card_id_map.insert(card.id.clone(), Uuid::new_v4().to_string());
    }
    for label in &export.labels {
        label_id_map.insert(label.id.clone(), Uuid::new_v4().to_string());
    }
    for checklist in &export.checklists {
        checklist_id_map.insert(checklist.id.clone(), Uuid::new_v4().to_string());
    }

    let board = Board {
        id: new_board_id.clone(),
        name: export.board.name.clone(),
        last_opened_at: Some(now.clone()),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    db.with_connection(|conn| {
        // Board
        conn.execute(
            "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&board.id, &board.name, &board.last_opened_at, &board.created_at, &board.updated_at],
        )?;

        // Columns
        for col in &export.columns {
            let new_id = &column_id_map[&col.id];
            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![new_id, &new_board_id, &col.name, col.order, col.archived as i32, &now, &now],
            )?;
        }

        // Cards
        for card in &export.cards {
            let new_id = &card_id_map[&card.id];
            let new_col_id = &column_id_map[&card.column_id];
            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at, due_date, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![new_id, new_col_id, &card.title, &card.description, card.order, card.archived as i32, &now, &now, &card.due_date, &card.priority],
            )?;
        }

        // Labels
        for label in &export.labels {
            let new_id = &label_id_map[&label.id];
            conn.execute(
                "INSERT INTO labels (id, board_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                rusqlite::params![new_id, &new_board_id, &label.name, &label.color, &now, &now],
            )?;
        }

        // Card labels
        for cl in &export.card_labels {
            if let (Some(new_card_id), Some(new_label_id)) = (card_id_map.get(&cl.card_id), label_id_map.get(&cl.label_id)) {
                conn.execute(
                    "INSERT INTO card_labels (card_id, label_id, created_at) VALUES (?, ?, ?)",
                    rusqlite::params![new_card_id, new_label_id, &now],
                )?;
            }
        }

        // Checklists
        for checklist in &export.checklists {
            let new_id = &checklist_id_map[&checklist.id];
            let new_card_id = &card_id_map[&checklist.card_id];
            conn.execute(
                r#"INSERT INTO checklists (id, card_id, name, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![new_id, new_card_id, &checklist.name, checklist.order, &now, &now],
            )?;
        }

        // Checklist items
        for item in &export.checklist_items {
            let new_id = Uuid::new_v4().to_string();
            let new_checklist_id = &checklist_id_map[&item.checklist_id];
            conn.execute(
                r#"INSERT INTO checklist_items (id, checklist_id, text, checked, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&new_id, new_checklist_id, &item.text, item.checked as i32, item.order, &now, &now],
            )?;
        }

        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(board)
}

#[tauri::command]
pub fn import_trello_json(
    db: tauri::State<'_, Arc<Database>>,
    json_data: String,
    board_name: Option<String>,
) -> Result<Board, String> {
    let trello: serde_json::Value =
        serde_json::from_str(&json_data).map_err(|e| format!("Invalid Trello JSON: {}", e))?;

    let now = Utc::now().to_rfc3339();
    let board_id = Uuid::new_v4().to_string();

    let name = board_name.unwrap_or_else(|| {
        trello["name"]
            .as_str()
            .unwrap_or("Imported Board")
            .to_string()
    });

    let board = Board {
        id: board_id.clone(),
        name: name.clone(),
        last_opened_at: Some(now.clone()),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    db.with_connection(|conn| {
        // Create board
        conn.execute(
            "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&board.id, &board.name, &board.last_opened_at, &board.created_at, &board.updated_at],
        )?;

        // Map Trello list IDs to our column IDs
        let mut list_id_map = std::collections::HashMap::new();

        if let Some(lists) = trello["lists"].as_array() {
            let mut open_lists: Vec<&serde_json::Value> = lists
                .iter()
                .filter(|l| !l["closed"].as_bool().unwrap_or(false))
                .collect();
            open_lists.sort_by(|a, b| {
                let pa = a["pos"].as_f64().unwrap_or(0.0);
                let pb = b["pos"].as_f64().unwrap_or(0.0);
                pa.partial_cmp(&pb).unwrap_or(std::cmp::Ordering::Equal)
            });

            for (i, list) in open_lists.iter().enumerate() {
                let trello_list_id = list["id"].as_str().unwrap_or("").to_string();
                let col_id = Uuid::new_v4().to_string();
                let col_name = list["name"].as_str().unwrap_or("Untitled").to_string();

                conn.execute(
                    r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                    rusqlite::params![&col_id, &board_id, &col_name, (i + 1) as f64, 0, &now, &now],
                )?;

                list_id_map.insert(trello_list_id, col_id);
            }
        }

        // Map Trello label IDs to our label IDs
        let mut label_id_map = std::collections::HashMap::new();

        if let Some(labels) = trello["labels"].as_array() {
            for trello_label in labels {
                let trello_label_id = trello_label["id"].as_str().unwrap_or("").to_string();
                let label_name = trello_label["name"].as_str().unwrap_or("").to_string();
                let label_color = trello_label["color"].as_str().unwrap_or("blue").to_string();

                if label_name.is_empty() && label_color.is_empty() {
                    continue;
                }

                let label_id = Uuid::new_v4().to_string();
                let mapped_color = map_trello_color(&label_color);

                conn.execute(
                    "INSERT INTO labels (id, board_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    rusqlite::params![&label_id, &board_id, if label_name.is_empty() { &label_color } else { &label_name }, &mapped_color, &now, &now],
                )?;

                label_id_map.insert(trello_label_id, label_id);
            }
        }

        // Import cards
        if let Some(cards) = trello["cards"].as_array() {
            let mut open_cards: Vec<&serde_json::Value> = cards
                .iter()
                .filter(|c| !c["closed"].as_bool().unwrap_or(false))
                .collect();
            open_cards.sort_by(|a, b| {
                let pa = a["pos"].as_f64().unwrap_or(0.0);
                let pb = b["pos"].as_f64().unwrap_or(0.0);
                pa.partial_cmp(&pb).unwrap_or(std::cmp::Ordering::Equal)
            });

            let mut card_id_map = std::collections::HashMap::new();

            for card in &open_cards {
                let trello_list_id = card["idList"].as_str().unwrap_or("").to_string();

                let col_id = match list_id_map.get(&trello_list_id) {
                    Some(id) => id.clone(),
                    None => continue,
                };

                let card_id = Uuid::new_v4().to_string();
                let trello_card_id = card["id"].as_str().unwrap_or("").to_string();
                let title = card["name"].as_str().unwrap_or("Untitled").to_string();
                let description = card["desc"].as_str().and_then(|d| {
                    if d.is_empty() { None } else { Some(d.to_string()) }
                });
                let due_date = card["due"].as_str().map(|d| d.to_string());
                let order = card["pos"].as_f64().unwrap_or(1.0);

                conn.execute(
                    r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at, due_date, priority)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
                    rusqlite::params![&card_id, &col_id, &title, &description, order, 0, &now, &now, &due_date, "none"],
                )?;

                card_id_map.insert(trello_card_id, card_id.clone());

                // Card labels
                if let Some(card_labels) = card["idLabels"].as_array() {
                    for label_ref in card_labels {
                        if let Some(trello_label_id) = label_ref.as_str() {
                            if let Some(our_label_id) = label_id_map.get(trello_label_id) {
                                conn.execute(
                                    "INSERT OR IGNORE INTO card_labels (card_id, label_id, created_at) VALUES (?, ?, ?)",
                                    rusqlite::params![&card_id, our_label_id, &now],
                                )?;
                            }
                        }
                    }
                }

                // Checklists
                if let Some(checklists) = card["checklists"].as_array() {
                    for (cl_idx, checklist) in checklists.iter().enumerate() {
                        let cl_id = Uuid::new_v4().to_string();
                        let cl_name = checklist["name"].as_str().unwrap_or("Checklist").to_string();

                        conn.execute(
                            r#"INSERT INTO checklists (id, card_id, name, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"#,
                            rusqlite::params![&cl_id, &card_id, &cl_name, (cl_idx + 1) as f64, &now, &now],
                        )?;

                        if let Some(check_items) = checklist["checkItems"].as_array() {
                            for (ci_idx, item) in check_items.iter().enumerate() {
                                let ci_id = Uuid::new_v4().to_string();
                                let text = item["name"].as_str().unwrap_or("").to_string();
                                let checked = item["state"].as_str() == Some("complete");

                                conn.execute(
                                    r#"INSERT INTO checklist_items (id, checklist_id, text, checked, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                                    rusqlite::params![&ci_id, &cl_id, &text, checked as i32, (ci_idx + 1) as f64, &now, &now],
                                )?;
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    })
    .map_err(|e| e.to_string())?;

    Ok(board)
}

fn map_trello_color(trello_color: &str) -> String {
    match trello_color {
        "green" => "#61bd4f".to_string(),
        "yellow" => "#f2d600".to_string(),
        "orange" => "#ff9f1a".to_string(),
        "red" => "#eb5a46".to_string(),
        "purple" => "#c377e0".to_string(),
        "blue" => "#0079bf".to_string(),
        "sky" => "#00c2e0".to_string(),
        "lime" => "#51e898".to_string(),
        "pink" => "#ff78cb".to_string(),
        "black" => "#344563".to_string(),
        _ => "#0079bf".to_string(),
    }
}
