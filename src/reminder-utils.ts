import * as chrono from 'chrono-node';
import { Environment, Reminder } from './types.js';

/**
 * Parse natural language text for reminder creation
 * @param text - The natural language text (e.g., "remind me to call mom tomorrow at 7pm")
 * @param userTimezone - User's timezone (default: 'Asia/Tehran')
 * @param referenceDate - Reference date for parsing (default: current time)
 * @returns Parsed reminder object or null if parsing failed
 */
export function parseReminderText(
	text: string,
	userTimezone: string = 'Asia/Tehran',
	referenceDate: Date = new Date()
): { task: string; scheduledAt: Date; confidence: 'high' | 'medium' | 'low' } | null {
	// Remove the "/remind" command and "me to" prefix
	const cleanText = text
		.replace(/^\/remind\s+/i, '')
		.replace(/^me\s+to\s+/i, '');

	// Use chrono to parse the date/time from the text
	const parsingContext = {
		instant: referenceDate,
		timezone: userTimezone
	};

	const results = chrono.parse(cleanText, parsingContext, { forwardDate: true });

	if (results.length === 0) {
		return null;
	}

	// Get the first (most relevant) result
	const result = results[0];
	const scheduledAt = result.date();

	// Check if the parsed date is in the past
	if (scheduledAt <= referenceDate) {
		return null; // We'll handle this in the calling function
	}

	// Extract task description by removing the time-related text
	const taskText = cleanText.substring(0, result.index) + cleanText.substring(result.index + result.text.length);
	const task = taskText.trim().replace(/\s+/g, ' ');

	// Determine confidence based on the specificity of the parsed result
	let confidence: 'high' | 'medium' | 'low' = 'low';

	if (result.start.isCertain('hour') && result.start.isCertain('minute')) {
		confidence = 'high';
	} else if (result.start.isCertain('day') && result.start.isCertain('month')) {
		confidence = 'medium';
	}

	return {
		task: task || 'Reminder',
		scheduledAt,
		confidence
	};
}

/**
 * Format a date for display to user in their timezone
 */
export function formatDateForUser(date: Date, timezone: string = 'Asia/Tehran'): string {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});

		return formatter.format(date);
	} catch (error) {
		// Fallback to UTC if timezone is invalid
		return date.toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}
}

/**
 * Create a reminder in the database
 */
export async function createReminder(
	db: D1Database,
	telegramId: number,
	taskDescription: string,
	scheduledAt: Date,
	timezone: string = 'Asia/Tehran'
): Promise<number> {
	const result = await db
		.prepare(`
			INSERT INTO reminders (telegram_id, task_description, scheduled_at, timezone)
			VALUES (?, ?, ?, ?)
		`)
		.bind(telegramId, taskDescription, scheduledAt.toISOString(), timezone)
		.run();

	if (!result.success || !result.meta?.last_row_id) {
		throw new Error('Failed to create reminder');
	}

	return result.meta.last_row_id as number;
}

/**
 * Get all active reminders for a user
 */
export async function getUserReminders(db: D1Database, telegramId: number): Promise<Reminder[]> {
	const result = await db
		.prepare(`
			SELECT id, telegram_id, task_description, scheduled_at, timezone, is_active, is_sent, created_at
			FROM reminders
			WHERE telegram_id = ? AND is_active = TRUE
			ORDER BY scheduled_at ASC
		`)
		.bind(telegramId)
		.all();

	return result.results as unknown as Reminder[];
}

/**
 * Get all reminders that are due to be sent
 */
export async function getDueReminders(db: D1Database): Promise<Reminder[]> {
	const now = new Date().toISOString();

	const result = await db
		.prepare(`
			SELECT id, telegram_id, task_description, scheduled_at, timezone, is_active, is_sent, created_at
			FROM reminders
			WHERE is_active = TRUE AND is_sent = FALSE AND scheduled_at <= ?
			ORDER BY scheduled_at ASC
		`)
		.bind(now)
		.all();

	return result.results as unknown as Reminder[];
}

/**
 * Delete a reminder by ID (only if it belongs to the user)
 */
export async function deleteReminder(db: D1Database, reminderId: number, telegramId: number): Promise<boolean> {
	const result = await db
		.prepare(`
			UPDATE reminders
			SET is_active = FALSE
			WHERE id = ? AND telegram_id = ?
		`)
		.bind(reminderId, telegramId)
		.run();

	return result.success && (result.meta?.changes || 0) > 0;
}

/**
 * Mark reminder as sent
 */
export async function markReminderAsSent(db: D1Database, reminderId: number): Promise<boolean> {
	const result = await db
		.prepare(`
			UPDATE reminders
			SET is_sent = TRUE
			WHERE id = ?
		`)
		.bind(reminderId)
		.run();

	return result.success && (result.meta?.changes || 0) > 0;
}

/**
 * Get user's timezone or default
 */
export async function getUserTimezone(db: D1Database, telegramId: number): Promise<string> {
	const result = await db
		.prepare('SELECT timezone FROM users WHERE telegram_id = ?')
		.bind(telegramId)
		.first() as { timezone?: string } | null;

	return result?.timezone || 'Asia/Tehran';
}

/**
 * Format reminder list for display
 */
export function formatRemindersList(reminders: Reminder[]): string {
	if (reminders.length === 0) {
		return '📅 You have no active reminders.';
	}

	let message = `📅 Your Active Reminders (${reminders.length}):\n\n`;

	reminders.forEach((reminder, index) => {
		const scheduledDate = new Date(reminder.scheduled_at);
		const formattedDate = formatDateForUser(scheduledDate, reminder.timezone);
		const isOverdue = scheduledDate < new Date();

		message += `${index + 1}. **${reminder.task_description}**\n`;
		message += `   📅 ${formattedDate}${isOverdue ? ' ⚠️ (Overdue)' : ''}\n`;
		message += `   🆔 ID: \`${reminder.id}\`\n\n`;
	});

	message += '💡 Use `/reminders delete <id>` to delete a reminder.';

	return message;
}

/**
 * Get admin reminders view (all reminders or specific user)
 */
export async function getAdminRemindersView(db: D1Database, specificUserId?: number): Promise<string> {
	let query = `
		SELECT r.id, r.telegram_id, r.task_description, r.scheduled_at, r.timezone, r.is_active, r.is_sent, r.created_at,
		       u.username, u.first_name
		FROM reminders r
		LEFT JOIN users u ON r.telegram_id = u.telegram_id
		WHERE r.is_active = TRUE
	`;

	const params: any[] = [];
	if (specificUserId) {
		query += ' AND r.telegram_id = ?';
		params.push(specificUserId);
	}

	query += ' ORDER BY r.scheduled_at ASC LIMIT 50';

	const result = await db.prepare(query).bind(...params).all();
	const reminders = result.results as unknown as (Reminder & { username?: string; first_name?: string })[];

	if (reminders.length === 0) {
		return specificUserId
			? `🔍 No active reminders found for user ID ${specificUserId}.`
			: '🔍 No active reminders found in the system.';
	}

	let message = specificUserId
		? `🔧 **Admin View: Reminders for User ${specificUserId}**\n\n`
		: `🔧 **Admin View: All Active Reminders (${reminders.length})**\n\n`;

	reminders.forEach((reminder, index) => {
		const scheduledDate = new Date(reminder.scheduled_at);
		const formattedDate = formatDateForUser(scheduledDate, reminder.timezone);
		const isOverdue = scheduledDate < new Date();
		const userName = reminder.first_name || reminder.username || 'Unknown';

		message += `${index + 1}. **${reminder.task_description}**\n`;
		message += `   👤 User: ${userName} (${reminder.telegram_id})\n`;
		message += `   📅 ${formattedDate}${isOverdue ? ' ⚠️ (Overdue)' : ''}\n`;
		message += `   🆔 ID: \`${reminder.id}\`\n\n`;
	});

	return message;
}
