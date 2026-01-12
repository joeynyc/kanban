---
active: true
iteration: 2
max_iterations: 0
completion_promise: null
started_at: "$(date -Iseconds)"
---

Implement Phase 4: Backend Rust Tests from /home/zerocool/.claude/plans/parsed-petting-feigenbaum.md

Phase 4 Tasks - CRITICAL: Database operations & data integrity tests

1. Create tests in src-tauri/src/commands/cards.rs:
   - test_create_card
   - test_update_card
   - test_delete_card
   - test_move_card
   - test_order_calculation_on_create
   - test_get_cards_for_board
   - test_get_cards_for_column
   - test_batch_update_card_orders

2. Create tests in src-tauri/src/commands/boards.rs:
   - test_create_board
   - test_get_all_boards
   - test_update_board
   - test_delete_board_cascades ⭐ CRITICAL
   - test_set_last_opened_board

3. Create tests in src-tauri/src/commands/columns.rs:
   - test_create_column
   - test_update_column
   - test_delete_column
   - test_reorder_columns
   - test_get_columns_for_board

4. Create tests in src-tauri/src/db/migrations.rs:
   - test_migrations_run_successfully
   - test_foreign_keys_enabled
   - test_indexes_created

5. Create src-tauri/src/integration_tests.rs:
   - test_full_workflow (board→columns→cards→move→delete cascade)

Focus on:
- Using test_helpers::create_test_db() for isolated databases
- Testing cascade deletes (⭐ CRITICAL)
- Testing order calculation correctness
- Testing optimistic update scenarios
- Using State<Arc<Database>> pattern

Target: 75%+ coverage of backend commands
Run: cd src-tauri && cargo test --all
