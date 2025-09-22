# AGENTS.md - Coding Guidelines for AI Assistants

This document provides clear guidelines for AI coding agents working on this Telegram bot project to ensure clean, maintainable, and consistent code.

## 🏗️ Project Architecture

This project follows a **modular architecture** with clear separation of concerns:

```
src/
├── index.ts          # Entry point - KEEP MINIMAL
├── types.ts          # All interfaces and types
├── database.ts       # Database operations only
├── admin.ts          # Admin utilities only
├── handlers.ts       # Command handlers only
└── [feature].ts      # Feature-specific modules
```

## 📋 Core Principles

### 1. **Single Responsibility Principle**
- Each file should have ONE clear purpose
- Each function should do ONE thing well
- If a file gets too large (>200 lines), split it

### 2. **Separation of Concerns**
- **Database operations** → `database.ts`
- **Admin utilities** → `admin.ts`
- **Command handling** → `handlers.ts`
- **Type definitions** → `types.ts`
- **Business logic** → Feature-specific files

### 3. **Keep index.ts Minimal**
- Only bot initialization and routing
- NO business logic in index.ts
- NO database operations in index.ts
- NO complex command handling in index.ts

## 🔧 Development Rules

### ✅ DO:
- **Import from modules**: Use the modular structure
- **Add new types** to `types.ts`
- **Add new DB functions** to `database.ts`
- **Add new commands** to `handlers.ts`
- **Export functions** explicitly
- **Use async/await** consistently
- **Handle errors** properly in each handler
- **Log interactions** for all user actions
- **Validate admin access** for admin commands

### ❌ DON'T:
- **Mix concerns** - don't put DB code in handlers directly
- **Create monolithic functions** - break complex logic down
- **Duplicate code** - create reusable functions instead
- **Skip error handling** - every handler needs try/catch
- **Hardcode values** - use environment variables
- **Break the module structure** - respect the architecture

## 🆕 Adding New Features

### Adding a New Command:
1. **Add handler** in `handlers.ts`:
   ```typescript
   export async function handleNewCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
     // Implementation
   }
   ```

2. **Register in** `index.ts`:
   ```typescript
   .on('newcommand', async (context) => handleNewCommand(context, env))
   ```

3. **Add types** if needed in `types.ts`
4. **Add DB operations** if needed in `database.ts`

### Adding Database Operations:
1. **Add function** to `database.ts`
2. **Export the function**
3. **Import in handlers** that need it
4. **Update types** if new interfaces needed

### Adding Admin Features:
1. **Add utilities** to `admin.ts`
2. **Use `isAdmin()`** for access control
3. **Import in handlers** that need admin features

## 🎯 Code Quality Standards

### Function Structure:
```typescript
export async function functionName(params: Type): Promise<ReturnType> {
  try {
    // Input validation
    if (!param) {
      throw new Error('Invalid input');
    }

    // Main logic
    const result = await someOperation(param);

    // Return result
    return result;
  } catch (error) {
    console.error('Error in functionName:', error);
    throw error; // Re-throw for handler to manage
  }
}
```

### Handler Structure:
```typescript
export async function handleCommand(context: TelegramExecutionContext, env: Environment): Promise<Response> {
  try {
    const { update, message, user } = extractMessageData(context);

    if (user) {
      // Always update user first
      await upsertUser(env.bot_users_db, userData);

      // Handle command logic
      const result = await commandLogic();

      // Send response
      await context.reply(result);

      // Log interaction
      await logInteraction(env.bot_users_db, user.id, 'command', message?.text, '/command');
    }
  } catch (error) {
    console.error('Error handling command:', error);
    await context.reply(`Sorry, something went wrong: ${error.message}`);
  }
  return new Response('ok');
}
```

## 🔍 Code Review Checklist

Before implementing changes, ensure:

- [ ] **Architecture respected**: Code goes in the right file
- [ ] **Error handling**: All async operations wrapped in try/catch
- [ ] **User tracking**: User data updated and interactions logged
- [ ] **Admin checks**: Admin-only features properly protected
- [ ] **Types updated**: New interfaces added to `types.ts`
- [ ] **Exports added**: New functions properly exported
- [ ] **No duplication**: Reusing existing functions where possible
- [ ] **Clean imports**: Only importing what's needed

## 🚀 Performance Guidelines

- **Use prepared statements** for database queries
- **Batch operations** when possible
- **Cache frequently used data** appropriately
- **Limit database calls** in single operations
- **Use proper indexes** for database queries

## 🔐 Security Guidelines

- **Validate all inputs** from Telegram
- **Use environment variables** for secrets
- **Check admin permissions** before sensitive operations
- **Sanitize user data** before database storage
- **Log security-relevant events**

## 📝 Documentation

- **Comment complex logic** clearly
- **Update this file** when architecture changes
- **Document new environment variables** in README
- **Keep CODE_STRUCTURE.md** up to date

## ⚠️ Common Pitfalls to Avoid

1. **Putting business logic in index.ts**
2. **Mixing database operations with command handling**
3. **Forgetting error handling in async operations**
4. **Not logging user interactions**
5. **Skipping admin permission checks**
6. **Creating functions that do too many things**
7. **Not updating types when adding new data structures**

## 🎯 Success Metrics

A well-structured addition should:
- ✅ Be in the correct file
- ✅ Have proper error handling
- ✅ Follow the established patterns
- ✅ Include proper typing
- ✅ Log user interactions
- ✅ Respect admin permissions
- ✅ Be easily testable

Remember: **Clean code is not just working code, it's maintainable code that future developers (including AI agents) can easily understand and extend.**
