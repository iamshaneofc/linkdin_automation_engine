# 📊 Database Connection Guide

This guide will walk you through connecting your LinkedIn Automation Engine to a PostgreSQL database.

## Prerequisites

Before you begin, ensure you have:
- ✅ **PostgreSQL** installed (v14 or higher) - [Download Here](https://www.postgresql.org/download/)
- ✅ **Node.js** installed (v18 or higher)
- ✅ PostgreSQL service running on your machine

---

## Step 1: Install PostgreSQL

### Windows:
1. Download PostgreSQL from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run the installer
3. **Remember the password** you set for the `postgres` user (you'll need it later)
4. Complete the installation

### macOS:
```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Step 2: Create the Database

### Option A: Using pgAdmin (GUI - Recommended for Beginners)

1. Open **pgAdmin 4** (installed with PostgreSQL)
2. Connect to your PostgreSQL server:
   - Right-click on **Servers** → **Create** → **Server**
   - **General Tab**: Name it `Local PostgreSQL` (or any name)
   - **Connection Tab**:
     - Host: `localhost`
     - Port: `5432`
     - Username: `postgres`
     - Password: (the password you set during installation)
   - Click **Save**
3. Create the database:
   - Expand **Servers** → **Local PostgreSQL** → **Databases**
   - Right-click **Databases** → **Create** → **Database**
   - **Database name**: `linkedin_leads`
   - **Owner**: `postgres`
   - Click **Save**

### Option B: Using Command Line (psql)

```bash
# Connect to PostgreSQL
psql -U postgres

# Enter your password when prompted
# Then run:
CREATE DATABASE linkedin_leads;

# Exit psql
\q
```

---

## Step 3: Create Database Tables

### Option A: Using pgAdmin

1. In pgAdmin, right-click on the `linkedin_leads` database
2. Select **Query Tool**
3. Open the file `backend/database/schema.sql` from this project
4. Copy all the SQL content
5. Paste it into the Query Tool
6. Click **Execute** (or press F5)

### Option B: Using Command Line

```bash
# Navigate to your project directory
cd backend

# Run the schema file
psql -U postgres -d linkedin_leads -f database/schema.sql
```

### Option C: Run Migrations (if available)

```bash
cd backend
# Check if there are migration files
ls database/migrations/

# Run migrations if needed (check your project's migration system)
```

---

## Step 4: Configure Environment Variables

1. Navigate to the `backend` folder
2. Create a `.env` file (if it doesn't exist)
3. Add the following database configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_NAME=linkedin_leads

# Optional: SSL Configuration (for remote databases)
# DB_SSL=false

# Optional: Connection Pool Settings
# DB_POOL_MAX=20
# DB_POOL_IDLE_TIMEOUT=30000
# DB_POOL_CONNECTION_TIMEOUT=2000
```

**Important**: Replace `YOUR_POSTGRES_PASSWORD_HERE` with the actual password you set during PostgreSQL installation.

---

## Step 5: Install Dependencies

Make sure all Node.js packages are installed:

```bash
cd backend
npm install
```

This will install the `pg` (PostgreSQL client) package and other dependencies.

---

## Step 6: Test the Database Connection

### Option A: Start the Server (Automatic Test)

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected
✅ Server running on port 3000
```

If you see `❌ Database connection error`, check:
- PostgreSQL service is running
- Database credentials in `.env` are correct
- Database `linkedin_leads` exists

### Option B: Run Test Script

```bash
cd backend
node scripts/check-database.js
```

Expected output:
```
🔍 Checking Database Connection...

✅ Database connected successfully!

📊 Database Info:
   Database: linkedin_leads
   User: postgres

✅ 'leads' table exists

📊 Total Leads: 0
```

### Option C: Direct Connection Test

```bash
cd backend
node scripts/test-db-direct.js
```

---

## Step 7: Verify Connection in Code

The database connection is automatically established when you import the database module:

```javascript
// In any file
import pool from './db.js';

// Test query
const result = await pool.query('SELECT NOW()');
console.log('Database time:', result.rows[0].now);
```

---

## Troubleshooting

### ❌ Error: "password authentication failed"

**Solution:**
- Verify the password in `.env` matches your PostgreSQL password
- Check if you're using the correct username (usually `postgres`)

### ❌ Error: "database does not exist"

**Solution:**
- Make sure you created the `linkedin_leads` database (Step 2)
- Verify `DB_NAME` in `.env` matches the database name

### ❌ Error: "connection refused" or "ECONNREFUSED"

**Solution:**
- Ensure PostgreSQL service is running:
  - **Windows**: Check Services → PostgreSQL
  - **macOS**: `brew services list` (should show `started`)
  - **Linux**: `sudo systemctl status postgresql`
- Verify `DB_HOST` is `localhost` (or correct IP)
- Check `DB_PORT` is `5432` (default PostgreSQL port)

### ❌ Error: "relation 'leads' does not exist"

**Solution:**
- Run the schema file to create tables (Step 3)
- Check that you're connected to the correct database

### ❌ Error: "SASL: client password must be a string"

**Solution:**
- This is already handled in the code, but if it occurs:
- Ensure `DB_PASSWORD` in `.env` is a string (not empty, not null)

---

## Remote Database Connection

If connecting to a remote PostgreSQL database (e.g., AWS RDS, Heroku, DigitalOcean):

```env
# Remote Database Configuration
DB_HOST=your-database-host.com
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=linkedin_leads
DB_SSL=true  # Usually required for remote databases
```

---

## Connection Pool Settings

The application uses a connection pool for efficient database access. You can customize these in `.env`:

```env
# Connection Pool Configuration
DB_POOL_MAX=20                    # Maximum connections in pool
DB_POOL_IDLE_TIMEOUT=30000        # Idle timeout in milliseconds
DB_POOL_CONNECTION_TIMEOUT=2000   # Connection timeout in milliseconds
```

---

## Next Steps

After successfully connecting:

1. ✅ **Verify tables exist**: Check that `leads` table and other tables are created
2. ✅ **Test API endpoints**: Start the server and test `/api/leads/stats`
3. ✅ **Import sample data**: Use the CSV import feature to add test leads
4. ✅ **Check logs**: Monitor console for any database errors

---

## Quick Reference

### Environment Variables Summary

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | `localhost` | ✅ |
| `DB_PORT` | Database port | `5432` | ✅ |
| `DB_USER` | Database user | `postgres` | ✅ |
| `DB_PASSWORD` | Database password | - | ✅ |
| `DB_NAME` | Database name | `linkedin_leads` | ✅ |
| `DB_SSL` | Enable SSL | `false` | ❌ |

### Useful Commands

```bash
# Start PostgreSQL (Windows)
net start postgresql-x64-14

# Start PostgreSQL (macOS)
brew services start postgresql@14

# Start PostgreSQL (Linux)
sudo systemctl start postgresql

# Connect via psql
psql -U postgres -d linkedin_leads

# Check if PostgreSQL is running
# Windows: Check Services
# macOS/Linux: ps aux | grep postgres
```

---

## Support

If you encounter issues:
1. Check the `backend/SETUP_GUIDE.md` for additional setup information
2. Review error messages in the console
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL is running and accessible

---

**✅ You're all set!** Your database should now be connected and ready to use.
