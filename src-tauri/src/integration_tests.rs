#[cfg(test)]
mod tests {
    use crate::db::test_helpers::test_helpers::create_test_db;
    use chrono::Utc;
    use uuid::Uuid;

    #[test]
    fn test_full_workflow() {
        let (db, _temp) = create_test_db();

        // 1. Create board
        let (board_id, col1_id, col2_id, card1_id, _card2_id) = db.with_connection(|conn| {
            let board_id = Uuid::new_v4().to_string();
            let col1_id = Uuid::new_v4().to_string();
            let col2_id = Uuid::new_v4().to_string();
            let card1_id = Uuid::new_v4().to_string();
            let card2_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            // Create board
            conn.execute(
                "INSERT INTO boards (id, name, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                rusqlite::params![&board_id, "My Project", &now, &now, &now],
            )?;

            // 2. Create 2 columns
            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col1_id, &board_id, "To Do", 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO columns (id, board_id, name, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&col2_id, &board_id, "In Progress", 2.0, 0, &now, &now],
            )?;

            // 3. Create 2 cards in column 1
            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card1_id, &col1_id, "Task 1", Some("First task"), 1.0, 0, &now, &now],
            )?;

            conn.execute(
                r#"INSERT INTO cards (id, column_id, title, description, "order", archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
                rusqlite::params![&card2_id, &col1_id, "Task 2", Some("Second task"), 2.0, 0, &now, &now],
            )?;

            Ok((board_id, col1_id, col2_id, card1_id, card2_id))
        }).unwrap();

        // Verify columns were created
        let columns_count = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM columns WHERE board_id = ? AND archived = 0"
            )?;
            stmt.query_row([&board_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(columns_count, 2);

        // Verify cards in column 1
        let col1_cards_count = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM cards WHERE column_id = ? AND archived = 0"
            )?;
            stmt.query_row([&col1_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(col1_cards_count, 2);

        // 4. Move card1 to column 2
        db.with_connection(|conn| {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                r#"UPDATE cards SET column_id = ?, "order" = ?, updated_at = ? WHERE id = ?"#,
                rusqlite::params![&col2_id, 1.0, &now, &card1_id],
            )
        }).unwrap();

        // 5. Verify column 1 has 1 card, column 2 has 1 card
        let col1_cards_after = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM cards WHERE column_id = ? AND archived = 0"
            )?;
            stmt.query_row([&col1_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(col1_cards_after, 1);

        let col2_cards_after = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM cards WHERE column_id = ? AND archived = 0"
            )?;
            stmt.query_row([&col2_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(col2_cards_after, 1);

        // 6. Delete board (this should cascade delete columns and cards)
        let delete_result = db.with_connection(|conn| {
            conn.execute("DELETE FROM boards WHERE id = ?", [&board_id])
        });
        assert!(delete_result.is_ok());

        // 7. Verify cascade (0 columns, 0 cards remain)
        let columns_after_delete = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM columns WHERE board_id = ?"
            )?;
            stmt.query_row([&board_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(columns_after_delete, 0);

        let col1_cards_after_delete = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM cards WHERE column_id = ?"
            )?;
            stmt.query_row([&col1_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(col1_cards_after_delete, 0);

        let col2_cards_after_delete = db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT COUNT(*) FROM cards WHERE column_id = ?"
            )?;
            stmt.query_row([&col2_id], |row| row.get::<_, i32>(0))
        }).unwrap();
        assert_eq!(col2_cards_after_delete, 0);
    }
}
