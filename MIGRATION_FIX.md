# Database Migration Instructions

## The Error You're Seeing

The application is trying to access a database column `uploadedReports` that doesn't exist yet in your database. You need to apply the database migration to add this column.

## Quick Fix - Apply the Migration

### Option 1: Using Drizzle Kit (Recommended)

Run these commands in your terminal (inside the `ai-medicalagent` folder):

```bash
cd ai-medicalagent
npx drizzle-kit push
```

This will automatically sync your database schema with the code.

### Option 2: Manual SQL Execution

If the above doesn't work, you can manually run the SQL migration:

1. Open your Neon Database dashboard
2. Go to the SQL Editor
3. Run this SQL command:

```sql
ALTER TABLE "sessionChatTable"
ADD COLUMN IF NOT EXISTS "uploadedReports" json;
```

### Option 3: Generate and Push Migration

```bash
cd ai-medicalagent
npx drizzle-kit generate
npx drizzle-kit push
```

## After Running Migration

1. The error will disappear
2. Refresh your dashboard page
3. All features will work:
   - History list will load
   - Health Trends will work
   - Lab report upload will function

## Verify Migration Success

After running the migration, you should see:

- ✅ No more "column uploadedReports does not exist" errors
- ✅ Dashboard loads without errors
- ✅ History shows your consultations

## What This Column Does

The `uploadedReports` column stores:

- Uploaded laboratory test reports
- AI analysis of lab results
- Risk assessments (green/yellow/red)
- Doctor-style explanations
- Historical lab data for trend tracking

## Troubleshooting

If you still see errors after migration:

1. **Restart the development server:**

   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Clear your browser cache and reload**

3. **Check database connection:**

   - Ensure your `.env.local` has correct `DATABASE_URL`
   - Verify Neon database is accessible

4. **Verify the column was added:**
   Run this query in your database:

   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'sessionChatTable';
   ```

   You should see `uploadedReports` with type `json` in the results.

## Need Help?

If you continue experiencing issues:

1. Check the terminal for detailed error messages
2. Verify your database credentials in `.env.local`
3. Ensure the `sessionChatTable` table exists in your database
