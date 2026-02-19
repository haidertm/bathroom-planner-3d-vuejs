#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if required variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "Error: Database configuration not found in .env file"
  echo "Please ensure DB_HOST, DB_USER, DB_NAME, and DB_PASSWORD are set"
  exit 1
fi

echo "Running migration against database: $DB_NAME on $DB_HOST"
echo "User: $DB_USER"

# Run the migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p ${DB_PORT:-5432} -f migration.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Clear browser IndexedDB cache (DevTools → Application → IndexedDB → Delete)"
  echo "2. Refresh the page"
else
  echo ""
  echo "❌ Migration failed. Please check your database credentials."
fi
