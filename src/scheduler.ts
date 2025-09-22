import { Environment } from './types.js';
import { getDueReminders, markReminderAsSent, formatDateForUser } from './reminder-utils.js';

/**
 * Send a reminder to a user via Telegram
 */
async function sendReminder(
	telegramBotToken: string,
	telegramId: number,
	taskDescription: string,
	timezone: string,
	scheduledAt: string
): Promise<boolean> {
	try {
		const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

		// Format the original scheduled time for context
		const originalTime = formatDateForUser(new Date(scheduledAt), timezone);

		const message = `⏰ **Reminder**\n\n${taskDescription}\n\n📅 Originally scheduled for: ${originalTime}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				chat_id: telegramId,
				text: message,
				parse_mode: 'Markdown'
			})
		});

		if (!response.ok) {
			console.error(`Failed to send reminder to ${telegramId}:`, await response.text());
			return false;
		}

		return true;
	} catch (error) {
		console.error(`Error sending reminder to ${telegramId}:`, error);
		return false;
	}
}

/**
 * Process due reminders
 * This function should be called by a scheduled worker or cron job
 */
export async function processDueReminders(env: Environment): Promise<{ sent: number; failed: number }> {
	let sent = 0;
	let failed = 0;

	try {
		// Get all reminders that are due
		const dueReminders = await getDueReminders(env.bot_users_db);

		console.log(`Processing ${dueReminders.length} due reminders`);

		for (const reminder of dueReminders) {
			try {
				// Send the reminder
				const success = await sendReminder(
					env.SECRET_TELEGRAM_API_TOKEN,
					reminder.telegram_id,
					reminder.task_description,
					reminder.timezone,
					reminder.scheduled_at
				);

				if (success) {
					// Mark as sent
					await markReminderAsSent(env.bot_users_db, reminder.id!);
					sent++;
					console.log(`Sent reminder ${reminder.id} to user ${reminder.telegram_id}`);
				} else {
					failed++;
					console.error(`Failed to send reminder ${reminder.id} to user ${reminder.telegram_id}`);
				}
			} catch (error) {
				failed++;
				console.error(`Error processing reminder ${reminder.id}:`, error);
			}
		}

	} catch (error) {
		console.error('Error in processDueReminders:', error);
	}

	return { sent, failed };
}

/**
 * Scheduled event handler for Cloudflare Workers
 * This will be triggered by a cron trigger
 */
export async function handleScheduledEvent(
	event: ScheduledEvent,
	env: Environment,
	ctx: ExecutionContext
): Promise<void> {
	try {
		console.log('Processing scheduled reminders...');
		const result = await processDueReminders(env);
		console.log(`Reminder processing complete. Sent: ${result.sent}, Failed: ${result.failed}`);
	} catch (error) {
		console.error('Error in scheduled event handler:', error);
	}
}
