#!/bin/bash

# Database management helper script for the Telegram bot

DB_NAME="bot-users-db"

case "$1" in
    "init-local")
        echo "Initializing local database..."
        npx wrangler d1 execute $DB_NAME --local --file=./schema.sql
        ;;
    "init-remote")
        echo "Initializing remote database..."
        npx wrangler d1 execute $DB_NAME --remote --file=./schema.sql
        ;;
    "users")
        echo "Fetching users..."
        npx wrangler d1 execute $DB_NAME --local --command "SELECT telegram_id, username, first_name, interaction_count, first_seen_at, last_seen_at FROM users ORDER BY interaction_count DESC LIMIT 10;"
        ;;
    "stats")
        echo "Getting database stats..."
        npx wrangler d1 execute $DB_NAME --local --command "SELECT COUNT(*) as total_users FROM users;"
        npx wrangler d1 execute $DB_NAME --local --command "SELECT COUNT(*) as total_interactions FROM interactions;"
        ;;
    "clear")
        echo "WARNING: This will delete all data from LOCAL database!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx wrangler d1 execute $DB_NAME --local --command "DELETE FROM interactions;"
            npx wrangler d1 execute $DB_NAME --local --command "DELETE FROM reminders;"
            npx wrangler d1 execute $DB_NAME --local --command "DELETE FROM users;"
            echo "All local data cleared."
        fi
        ;;
    "clear-remote")
        echo "WARNING: This will delete all data from REMOTE/PRODUCTION database!"
        echo "This action is IRREVERSIBLE and will affect your live bot!"
        read -p "Are you absolutely sure? Type 'YES' to confirm: " -r
        echo
        if [[ $REPLY == "YES" ]]; then
            echo "Clearing remote database..."
            npx wrangler d1 execute $DB_NAME --remote --command "DELETE FROM interactions;"
            npx wrangler d1 execute $DB_NAME --remote --command "DELETE FROM reminders;"
            npx wrangler d1 execute $DB_NAME --remote --command "DELETE FROM users;"
            echo "All remote data cleared."
        else
            echo "Operation cancelled."
        fi
        ;;
    "reset-remote")
        echo "WARNING: This will DROP and recreate all tables in REMOTE/PRODUCTION database!"
        echo "This action is IRREVERSIBLE and will affect your live bot!"
        read -p "Are you absolutely sure? Type 'YES' to confirm: " -r
        echo
        if [[ $REPLY == "YES" ]]; then
            echo "Resetting remote database schema..."
            npx wrangler d1 execute $DB_NAME --remote --command "DROP TABLE IF EXISTS interactions;"
            npx wrangler d1 execute $DB_NAME --remote --command "DROP TABLE IF EXISTS reminders;"
            npx wrangler d1 execute $DB_NAME --remote --command "DROP TABLE IF EXISTS users;"
            echo "Tables dropped. Recreating schema..."
            npx wrangler d1 execute $DB_NAME --remote --file=./schema.sql
            echo "Remote database reset complete."
        else
            echo "Operation cancelled."
        fi
        ;;
    *)
        echo "Usage: $0 {init-local|init-remote|users|stats|clear|clear-remote|reset-remote}"
        echo "  init-local   - Initialize local database with schema"
        echo "  init-remote  - Initialize remote database with schema"
        echo "  users        - Show top 10 users by interaction count (local)"
        echo "  stats        - Show database statistics (local)"
        echo "  clear        - Clear all data (LOCAL only)"
        echo "  clear-remote - Clear all data from REMOTE database"
        echo "  reset-remote - DROP and recreate all tables (REMOTE only)"
        exit 1
        ;;
esac
