import * as chrono from 'chrono-node';
import { Environment, Reminder, RecurrencePattern } from './types.js';
import { t } from './i18n.js';

/**
 * Escape special characters for MarkdownV2
 */
function escapeMarkdownV2(text: string): string {
	return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Parse recurring patterns from text
 * @param text - Text like "every 3 hours", "every day", "every week"
 * @returns RecurrencePattern or null if not recurring
 */
export function parseRecurrencePattern(text: string): RecurrencePattern | null {
	const lowerText = text.toLowerCase();

	// Patterns: "every X hours/minutes/days/weeks/months"
	const everyPattern = /every\s+(\d+)\s+(minutes?|hours?|days?|weeks?|months?)/i;
	const everyMatch = lowerText.match(everyPattern);

	if (everyMatch) {
		const value = parseInt(everyMatch[1]);
		const unitText = everyMatch[2].toLowerCase().replace(/s$/, ''); // Remove plural 's'

		// Normalize units to plural form
		let unit: RecurrencePattern['unit'];
		switch (unitText) {
			case 'minute':
				unit = 'minutes';
				break;
			case 'hour':
				unit = 'hours';
				break;
			case 'day':
				unit = 'days';
				break;
			case 'week':
				unit = 'weeks';
				break;
			case 'month':
				unit = 'months';
				break;
			default:
				unit = unitText as RecurrencePattern['unit']; // fallback
		}

		return {
			type: 'interval',
			value,
			unit
		};
	}

	// Simple patterns: "every hour", "every day", etc.
	const simpleEveryPattern = /every\s+(minute|hour|day|week|month)/i;
	const simpleMatch = lowerText.match(simpleEveryPattern);

	if (simpleMatch) {
		const unitText = simpleMatch[1].toLowerCase();

		// Normalize to plural
		let unit: RecurrencePattern['unit'];
		switch (unitText) {
			case 'minute':
				unit = 'minutes';
				break;
			case 'hour':
				unit = 'hours';
				break;
			case 'day':
				unit = 'days';
				break;
			case 'week':
				unit = 'weeks';
				break;
			case 'month':
				unit = 'months';
				break;
			default:
				return null;
		}

		return {
			type: 'interval',
			value: 1,
			unit
		};
	}

	// Daily/hourly/weekly patterns
	const frequencyPattern = /\b(daily|hourly|weekly|monthly)\b/i;
	const frequencyMatch = lowerText.match(frequencyPattern);

	if (frequencyMatch) {
		const frequency = frequencyMatch[1].toLowerCase();
		switch (frequency) {
			case 'hourly':
				return { type: 'interval', value: 1, unit: 'hours' };
			case 'daily':
				return { type: 'interval', value: 1, unit: 'days' };
			case 'weekly':
				return { type: 'interval', value: 1, unit: 'weeks' };
			case 'monthly':
				return { type: 'interval', value: 1, unit: 'months' };
		}
	}

	return null;
}

/**
 * Calculate next occurrence date based on recurrence pattern
 */
export function calculateNextOccurrence(
	lastDate: Date,
	pattern: RecurrencePattern,
	timezone: string = 'Asia/Tehran'
): Date {
	const next = new Date(lastDate);

	switch (pattern.unit) {
		case 'minutes':
			next.setMinutes(next.getMinutes() + pattern.value);
			break;
		case 'hours':
			next.setHours(next.getHours() + pattern.value);
			break;
		case 'days':
			next.setDate(next.getDate() + pattern.value);
			break;
		case 'weeks':
			next.setDate(next.getDate() + (pattern.value * 7));
			break;
		case 'months':
			next.setMonth(next.getMonth() + pattern.value);
			break;
	}

	return next;
}

/**
 * Parse natural language text for reminder creation (updated to support recurring)
 * @param text - The natural language text (e.g., "remind me to call mom tomorrow at 7pm")
 * @param userTimezone - User's timezone (default: 'Asia/Tehran')
 * @param referenceDate - Reference date for parsing (default: current time)
 * @returns Parsed reminder object or null if parsing failed
 */
export function parseReminderText(
	text: string,
	userTimezone: string = 'Asia/Tehran',
	referenceDate: Date = new Date()
): { task: string; scheduledAt: Date; confidence: 'high' | 'medium' | 'low'; isRecurring?: boolean; recurrencePattern?: RecurrencePattern } | null {
	// Remove the "/remind" or "remind" command and "me to" prefix
	const cleanText = text
		.replace(/^\/remind\s+/i, '')
		.replace(/^remind\s+/i, '')
		.replace(/^me\s+to\s+/i, '');

	// Check for recurring patterns first
	const recurrencePattern = parseRecurrencePattern(cleanText);
	const isRecurring = recurrencePattern !== null;

	// Remove recurring patterns from text for date parsing
	let textForDateParsing = cleanText;
	if (isRecurring) {
		// Remove recurring pattern text to get cleaner date parsing
		textForDateParsing = cleanText
			.replace(/every\s+\d+\s+(minutes?|hours?|days?|weeks?|months?)/gi, '')
			.replace(/every\s+(minute|hour|day|week|month)/gi, '')
			.replace(/\b(daily|hourly|weekly|monthly)\b/gi, '')
			.trim();

		// If no specific time is mentioned for recurring, assume "now" for first occurrence
		if (!textForDateParsing || !/\d/.test(textForDateParsing)) {
			textForDateParsing = 'now';
		}
	}

	// Use chrono to parse the date/time from the text
	const parsingContext = {
		instant: referenceDate,
		timezone: userTimezone
	};

	const results = chrono.parse(textForDateParsing, parsingContext, { forwardDate: true });

	if (results.length === 0) {
		// For recurring reminders without specific time, start immediately
		if (isRecurring) {
			const scheduledAt = new Date(referenceDate);
			scheduledAt.setSeconds(0, 0); // Clean up seconds/milliseconds

			return {
				task: cleanText.replace(/every\s+\d+\s+(minutes?|hours?|days?|weeks?|months?)/gi, '')
					.replace(/every\s+(minute|hour|day|week|month)/gi, '')
					.replace(/\b(daily|hourly|weekly|monthly)\b/gi, '')
					.trim() || 'Recurring reminder',
				scheduledAt,
				confidence: 'medium',
				isRecurring: true,
				recurrencePattern
			};
		}
		return null;
	}

	// Get the first (most relevant) result
	const result = results[0];
	const scheduledAt = result.date();

	// For non-recurring reminders, check if the parsed date is in the past
	if (!isRecurring && scheduledAt <= referenceDate) {
		return null;
	}

	// Extract task description by removing the time-related text
	const taskText = textForDateParsing.substring(0, result.index) + textForDateParsing.substring(result.index + result.text.length);
	let task = taskText.trim().replace(/\s+/g, ' ');

	// If recurring, also remove recurring patterns from task description
	if (isRecurring) {
		task = cleanText
			.replace(/every\s+\d+\s+(minutes?|hours?|days?|weeks?|months?)/gi, '')
			.replace(/every\s+(minute|hour|day|week|month)/gi, '')
			.replace(/\b(daily|hourly|weekly|monthly)\b/gi, '')
			.replace(result.text, '')
			.trim()
			.replace(/\s+/g, ' ');
	}

	// Determine confidence based on the specificity of the parsed result
	let confidence: 'high' | 'medium' | 'low' = 'low';

	if (result.start.isCertain('hour') && result.start.isCertain('minute')) {
		confidence = 'high';
	} else if (result.start.isCertain('day') && result.start.isCertain('month')) {
		confidence = 'medium';
	}

	// Lower confidence for recurring reminders as they're more complex
	if (isRecurring && confidence === 'high') {
		confidence = 'medium';
	}

	const returnValue: any = {
		task: task || 'Reminder',
		scheduledAt,
		confidence
	};

	if (isRecurring) {
		returnValue.isRecurring = true;
		returnValue.recurrencePattern = recurrencePattern;
	}

	return returnValue;
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
 * Create a reminder in the database (updated to support recurring)
 */
export async function createReminder(
	db: D1Database,
	telegramId: number,
	taskDescription: string,
	scheduledAt: Date,
	timezone: string = 'Asia/Tehran',
	isRecurring: boolean = false,
	recurrencePattern?: RecurrencePattern,
	maxOccurrences?: number,
	recurrenceEndDate?: Date
): Promise<number> {
	const recurrencePatternJson = recurrencePattern ? JSON.stringify(recurrencePattern) : null;

	const result = await db
		.prepare(`
			INSERT INTO reminders (
				telegram_id, task_description, scheduled_at, timezone,
				is_recurring, recurrence_pattern, max_occurrences, recurrence_end_date
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(
			telegramId,
			taskDescription,
			scheduledAt.toISOString(),
			timezone,
			isRecurring,
			recurrencePatternJson,
			maxOccurrences || null,
			recurrenceEndDate?.toISOString() || null
		)
		.run();

	if (!result.success || !result.meta?.last_row_id) {
		throw new Error('Failed to create reminder');
	}

	return result.meta.last_row_id as number;
}

/**
 * Get all active reminders for a user (updated to include recurring fields)
 */
export async function getUserReminders(db: D1Database, telegramId: number): Promise<Reminder[]> {
	const result = await db
		.prepare(`
			SELECT id, telegram_id, task_description, scheduled_at, timezone, is_active, is_sent,
			       is_recurring, recurrence_pattern, parent_reminder_id, last_occurrence_at,
			       max_occurrences, occurrence_count, recurrence_end_date, created_at
			FROM reminders
			WHERE telegram_id = ? AND is_active = TRUE
			ORDER BY scheduled_at ASC
		`)
		.bind(telegramId)
		.all();

	return result.results as unknown as Reminder[];
}

/**
 * Get all reminders that are due to be sent (updated to include recurring fields)
 */
export async function getDueReminders(db: D1Database): Promise<Reminder[]> {
	const now = new Date().toISOString();

	const result = await db
		.prepare(`
			SELECT id, telegram_id, task_description, scheduled_at, timezone, is_active, is_sent,
			       is_recurring, recurrence_pattern, parent_reminder_id, last_occurrence_at,
			       max_occurrences, occurrence_count, recurrence_end_date, created_at
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
 * Create next occurrence for a recurring reminder
 */
export async function createNextRecurrence(
	db: D1Database,
	reminder: Reminder
): Promise<number | null> {
	if (!reminder.is_recurring || !reminder.recurrence_pattern) {
		return null;
	}

	try {
		const pattern: RecurrencePattern = JSON.parse(reminder.recurrence_pattern);
		const currentDate = new Date(reminder.scheduled_at);
		const nextDate = calculateNextOccurrence(currentDate, pattern, reminder.timezone);

		// Check if we should create next occurrence
		const shouldContinue = await shouldCreateNextOccurrence(db, reminder, nextDate);
		if (!shouldContinue) {
			return null;
		}

		// Create the next occurrence
		const nextReminderId = await createReminder(
			db,
			reminder.telegram_id,
			reminder.task_description,
			nextDate,
			reminder.timezone,
			false, // Next occurrence is not recurring itself
			undefined,
			undefined,
			undefined
		);

		// Link to parent and update parent's occurrence tracking
		await db
			.prepare(`
				UPDATE reminders
				SET parent_reminder_id = ?, occurrence_count = occurrence_count + 1,
				    last_occurrence_at = ?
				WHERE id = ?
			`)
			.bind(reminder.id, nextDate.toISOString(), nextReminderId)
			.run();

		// Update parent reminder's last occurrence
		await db
			.prepare(`
				UPDATE reminders
				SET last_occurrence_at = ?, occurrence_count = occurrence_count + 1
				WHERE id = ?
			`)
			.bind(nextDate.toISOString(), reminder.id)
			.run();

		return nextReminderId;
	} catch (error) {
		console.error('Error creating next recurrence:', error);
		return null;
	}
}

/**
 * Check if we should create the next occurrence of a recurring reminder
 */
async function shouldCreateNextOccurrence(
	db: D1Database,
	reminder: Reminder,
	nextDate: Date
): Promise<boolean> {
	// Check max occurrences limit
	if (reminder.max_occurrences && reminder.occurrence_count) {
		if (reminder.occurrence_count >= reminder.max_occurrences) {
			return false;
		}
	}

	// Check end date
	if (reminder.recurrence_end_date) {
		const endDate = new Date(reminder.recurrence_end_date);
		if (nextDate > endDate) {
			return false;
		}
	}

	// Check if reminder is still active
	if (!reminder.is_active) {
		return false;
	}

	return true;
}

/**
 * Stop all future occurrences of a recurring reminder
 */
export async function stopRecurringReminder(
	db: D1Database,
	reminderId: number,
	telegramId: number
): Promise<boolean> {
	const result = await db
		.prepare(`
			UPDATE reminders
			SET is_active = FALSE
			WHERE (id = ? OR parent_reminder_id = ?)
			  AND telegram_id = ?
			  AND is_sent = FALSE
		`)
		.bind(reminderId, reminderId, telegramId)
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
 * Format reminder list for display (updated to show recurring info)
 */
export function formatRemindersList(reminders: Reminder[]): string {
	if (reminders.length === 0) {
		return t('reminders.no_active_reminders');
	}

	let message = t('reminders.active_reminders_title', { count: reminders.length });

	reminders.forEach((reminder, index) => {
		const scheduledDate = new Date(reminder.scheduled_at);
		const formattedDate = escapeMarkdownV2(formatDateForUser(scheduledDate, reminder.timezone));
		const isOverdue = scheduledDate < new Date();

		let recurringInfo = '';
		if (reminder.is_recurring && reminder.recurrence_pattern) {
			try {
				const pattern: RecurrencePattern = JSON.parse(reminder.recurrence_pattern);
				recurringInfo = ` 🔄 \\(every ${pattern.value} ${pattern.unit}\\)`;

				// Add occurrence count if available
				if (reminder.occurrence_count && reminder.occurrence_count > 0) {
					recurringInfo += ` \\[${reminder.occurrence_count} times\\]`;
				}
			} catch (error) {
				recurringInfo = ' 🔄 \\(recurring\\)';
			}
		}

		message += t('reminders.reminder_item', {
			index: index + 1,
			task: escapeMarkdownV2(reminder.task_description),
			date: formattedDate,
			overdue: isOverdue ? t('reminders.overdue_marker') : '',
			id: reminder.id?.toString() || ''
		}).replace('{id}', reminder.id?.toString() || '') + recurringInfo + '\n';
	});

	message += t('reminders.delete_instructions');
	message += t('reminders.recurring_delete_instructions');

	return message;
}

/**
 * Get admin reminders view (all reminders or specific user) - updated for recurring
 */
export async function getAdminRemindersView(db: D1Database, specificUserId?: number): Promise<string> {
	let query = `
		SELECT r.id, r.telegram_id, r.task_description, r.scheduled_at, r.timezone, r.is_active, r.is_sent,
		       r.is_recurring, r.recurrence_pattern, r.parent_reminder_id, r.last_occurrence_at,
		       r.max_occurrences, r.occurrence_count, r.recurrence_end_date, r.created_at,
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
		return t('admin.no_reminders_admin');
	}

	let message = specificUserId
		? t('admin.reminders_view_user', { userId: specificUserId })
		: t('admin.reminders_view_all', { count: reminders.length });

		reminders.forEach((reminder, index) => {
			const scheduledDate = new Date(reminder.scheduled_at);
			const formattedDate = escapeMarkdownV2(formatDateForUser(scheduledDate, reminder.timezone));
			const isOverdue = scheduledDate < new Date();
			const userName = escapeMarkdownV2(reminder.first_name || reminder.username || 'Unknown');

			let recurringInfo = '';
			if (reminder.is_recurring && reminder.recurrence_pattern) {
				try {
					const pattern: RecurrencePattern = JSON.parse(reminder.recurrence_pattern);
					recurringInfo = ` 🔄 \\(every ${pattern.value} ${pattern.unit}\\)`;

					if (reminder.occurrence_count && reminder.occurrence_count > 0) {
						recurringInfo += ` \\[${reminder.occurrence_count}x\\]`;
					}
				} catch (error) {
					recurringInfo = ' 🔄 \\(recurring\\)';
				}
			}

			message += t('admin.admin_reminder_item', {
				index: index + 1,
				task: escapeMarkdownV2(reminder.task_description),
				userName: userName,
				userId: reminder.telegram_id,
				date: formattedDate,
				overdue: isOverdue ? t('reminders.overdue_marker') : '',
				id: reminder.id?.toString() || ''
			}) + recurringInfo + '\n';
		});	return message;
}
