# Supabase MCP Server for Self-hosted Instances

A Model Context Protocol (MCP) server that provides comprehensive Supabase functionality for self-hosted instances. This server enables seamless integration with Cursor, Windsurf and other IDEs and other MCP clients.

## 🚀 Features

- **Authentication Management**: Create, list, update, and delete users
- **Database Operations**: Execute SQL queries, manage tables, and handle migrations
- **Storage Management**: Create buckets, upload/download files, and manage storage
- **Row Level Security (RLS)**: Create and manage RLS policies
- **Real-time Subscriptions**: Set up and manage real-time database subscriptions
- **Edge Functions**: Invoke and manage edge functions
- **Admin Operations**: Database statistics, user analytics, and system monitoring

## 📋 Prerequisites

- Node.js 18+
- A running Supabase self-hosted instance
- Access to your Supabase configuration files

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/f4ztx/f4ztx-mcp-supabase-self-hosted.git
   cd mcp-supabase-self
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Step 1: Configure Your Supabase Self-hosted Instance

First, ensure your Supabase self-hosted instance has the correct JWT secret configured. In your Supabase project directory:

```bash
cd ~/supabase-project
nano .env
```

**Critical**: Note down your `JWT_SECRET` value from the Supabase `.env` file:

```env
# This is the JWT secret used to sign tokens
JWT_SECRET=your-jwt-secret-here

# Other important values
POSTGRES_PASSWORD=your-postgres-password
SITE_URL=https://your-supabase-domain.com
SUPABASE_PUBLIC_URL=https://your-supabase-domain.com
```

### Step 2: Generate Valid JWT Tokens

The MCP server requires JWT tokens that are signed with the **same JWT secret** as your Supabase instance.

1. **Install jsonwebtoken dependency**

   ```bash
   npm install jsonwebtoken
   ```

2. **Update the token generation script**

   Edit `scripts/generate-tokens.js` and replace the JWT_SECRET with your Supabase JWT secret:

   ```javascript
   // Replace this with your Supabase JWT_SECRET
   const JWT_SECRET = "your-jwt-secret-from-supabase-env";
   ```

3. **Generate the tokens**

   ```bash
   node scripts/generate-tokens.js
   ```

   This will output:

   ```
   === TOKENS GENERATED ===

   SUPABASE_ANON_KEY=
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   SUPABASE_SERVICE_ROLE_KEY=
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   ✅ ANON_KEY valid: anon
   ✅ SERVICE_ROLE_KEY valid: service_role
   ```

### Step 3: Configure MCP Client

Create or update your MCP configuration file (`~/.cursor/mcp.json` for Cursor, Windsurf and other IDEs):

```json
{
  "mcpServers": {
    "supabase_self_hosted": {
      "command": "node",
      "args": ["/path/to/your/project/dist/server.js"],
      "env": {
        "SUPABASE_URL": "https://your-supabase-domain.com",
        "SUPABASE_SERVICE_ROLE_KEY": "your-generated-service-role-key",
        "SUPABASE_ANON_KEY": "your-generated-anon-key",
        "SUPABASE_DB_URL": "postgresql://postgres:password@host:port/postgres",
        "SUPABASE_JWT_SECRET": "your-jwt-secret-from-supabase-env"
      }
    }
  }
}
```

### Step 4: Restart Services

1. **Restart your Supabase instance** (if you made changes):

   ```bash
   cd ~/supabase-project
   docker compose down && docker compose up -d
   ```

2. **Restart your MCP client** (Cursor will automatically restart when `mcp.json` changes)

## 🔐 Important Security Notes

### JWT Secret Synchronization

**Critical**: The `JWT_SECRET` must be identical in three places:

1. **Supabase self-hosted `.env** file
2. **Token generation script** (`scripts/generate-tokens.js`)
3. **MCP configuration** (`mcp.json`)

```
Supabase .env JWT_SECRET = generate-tokens.js JWT_SECRET = mcp.json JWT_SECRET
```

### Token Expiration

Generated tokens expire after 1 year. To regenerate:

1. Run `node scripts/generate-tokens.js`
2. Update your `mcp.json` with the new tokens
3. Restart your MCP client

## 🧪 Testing the Setup

Once configured, test the connection:

```javascript
// Test user creation
mcp_supabase_cursor_create_auth_user({
  email: "test@example.com",
  password: "SecurePassword123!",
  emailConfirm: true,
});

// Test user listing
mcp_supabase_cursor_list_auth_users({ limit: 10 });

// Test database query
mcp_supabase_cursor_database_query({
  query: "SELECT COUNT(*) FROM auth.users",
});
```

## 📚 Available Functions

### Authentication

- `create_auth_user` - Create a new user
- `list_auth_users` - List all users
- `get_auth_user` - Get user by ID
- `update_auth_user` - Update user information
- `delete_auth_user` - Delete a user
- `reset_user_password` - Reset user password

### Database

- `database_query` - Execute SQL queries
- `create_table` - Create new tables
- `list_tables` - List all tables
- `describe_table` - Get table schema
- `drop_table` - Delete tables
- `create_index` - Create database indexes

### Storage

- `create_storage_bucket` - Create storage buckets
- `list_storage_buckets` - List all buckets
- `upload_file` - Upload files
- `download_file` - Download files
- `delete_file` - Delete files
- `list_files` - List files in bucket

### Row Level Security (RLS)

- `create_rls_policy` - Create RLS policies
- `list_rls_policies` - List policies for table
- `delete_rls_policy` - Delete RLS policy
- `enable_rls` - Enable RLS on table
- `disable_rls` - Disable RLS on table

### Real-time

- `create_realtime_subscription` - Create real-time subscriptions
- `list_realtime_subscriptions` - List active subscriptions
- `delete_realtime_subscription` - Remove subscriptions

### Admin & Monitoring

- `get_database_stats` - Database statistics
- `get_user_stats` - User analytics
- `get_system_info` - System information
- `get_logs` - System logs
- `get_metrics` - Performance metrics

## 🚨 Troubleshooting

### "invalid JWT signature" Error

**Cause**: JWT_SECRET mismatch between Supabase and generated tokens  
**Solution**: Ensure JWT_SECRET is identical in all three locations

### "Invalid authentication credentials" Error

**Cause**: Tokens not generated with correct script  
**Solution**: Regenerate tokens using `generate-tokens.js`

### "Variables undefined" Error

**Cause**: Using local `.env` instead of `mcp.json`  
**Solution**: Configure variables in `mcp.json`, not local `.env`

### Connection Issues

1. Verify Supabase is running: `docker compose ps`
2. Test database connection: `psql "your-db-url" -c "SELECT 1;"`
3. Check token validity:
   ```bash
   node -e "
   const jwt = require('jsonwebtoken');
   const token = 'your-service-role-key';
   const secret = 'your-jwt-secret';
   console.log(jwt.verify(token, secret));
   "
   ```

## 🏗️ Architecture

### Environment Variable Flow

```
MCP Client (mcp.json) → MCP Server Process → process.env → Supabase Client
```

**Note**: Local `.env` files are **not used** when running as an MCP server. All configuration must be in `mcp.json`.

### Token Generation Process

```
Supabase JWT_SECRET → generate-tokens.js → Valid JWT Tokens → MCP Configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

**Made for Supabase self-hosted deployments** 🚀
