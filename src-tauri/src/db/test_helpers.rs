#[cfg(test)]
pub mod test_helpers {
    use crate::db::Database;
    use tempfile::NamedTempFile;

    pub fn create_test_db() -> (Database, NamedTempFile) {
        let temp_file = NamedTempFile::new().unwrap();
        let db = Database::new(temp_file.path()).unwrap();
        db.run_migrations().unwrap();
        (db, temp_file)
    }
}
