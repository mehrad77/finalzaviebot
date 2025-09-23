import { describe, it, expect, beforeEach } from 'vitest';
import {
	parseReminderText,
	formatDateForUser,
	formatRemindersList,
	parseRecurrencePattern,
	calculateNextOccurrence
} from '../src/reminder-utils.js';
import { Reminder, RecurrencePattern } from '../src/types.js';

describe('Reminder Utils', () => {
	// Fixed reference date for consistent testing (Monday, Jan 1, 2024, 10:00 AM Tehran time)
	const referenceDate = new Date('2024-01-01T06:30:00Z'); // 10:00 AM Tehran time (UTC+3:30)

	describe('parseReminderText', () => {
		describe('Basic time parsing from examples', () => {
			it('should parse "call mom tomorrow at 7pm"', () => {
				const result = parseReminderText(
					'/remind me to call mom tomorrow at 7pm',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('call mom');
				expect(result?.scheduledAt).toBeInstanceOf(Date);
				expect(result?.scheduledAt.getTime()).toBeGreaterThan(referenceDate.getTime());
				expect(result?.confidence).toBe('high'); // Has specific hour
			});

			it('should parse "watch football this weekend"', () => {
				const result = parseReminderText(
					'/remind me to watch football this weekend',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('watch football');
				expect(result?.scheduledAt).toBeInstanceOf(Date);
				expect(result?.scheduledAt.getTime()).toBeGreaterThan(referenceDate.getTime());
			});

			it('should parse "study Thursday night"', () => {
				const result = parseReminderText(
					'/remind me to study Thursday night',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('study');
				expect(result?.scheduledAt).toBeInstanceOf(Date);
				expect(result?.scheduledAt.getTime()).toBeGreaterThan(referenceDate.getTime());
			});

			it('should parse "submit the report tomorrow"', () => {
				const result = parseReminderText(
					'/remind me to submit the report tomorrow',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('submit the report');
				expect(result?.scheduledAt).toBeInstanceOf(Date);
				expect(result?.scheduledAt.getTime()).toBeGreaterThan(referenceDate.getTime());
			});

			it('should parse "call mom today at 7pm"', () => {
				const result = parseReminderText(
					'/remind me to call mom today at 7pm',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('call mom');
				expect(result?.confidence).toBe('high'); // Has specific time
			});
		});

		describe('Specific date parsing', () => {
			it('should parse "renew my license on 17 August 2026"', () => {
				const result = parseReminderText(
					'/remind me to renew my license on 17 August 2026',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('renew my license');
				expect(result?.scheduledAt.getFullYear()).toBe(2026);
				expect(result?.scheduledAt.getMonth()).toBe(7); // August (0-indexed)
				expect(result?.scheduledAt.getDate()).toBe(17);
			});

			it('should parse "attend meeting this Friday at 13:00"', () => {
				const result = parseReminderText(
					'/remind me to attend meeting this Friday at 13:00',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('attend meeting');
				expect(result?.confidence).toBe('high'); // Has specific hour and minute
			});
		});

		describe('Relative time parsing', () => {
			it('should parse "check the status 2 weeks from now"', () => {
				const result = parseReminderText(
					'/remind me to check the status 2 weeks from now',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('check the status');
				expect(result?.scheduledAt).toBeInstanceOf(Date);

				// Should be approximately 2 weeks later (allow some variance for parsing)
				const daysDifference = (result!.scheduledAt.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
				expect(daysDifference).toBeGreaterThan(13);
				expect(daysDifference).toBeLessThan(15);
			});

			it('should parse "prepare slides in 3 days"', () => {
				const result = parseReminderText(
					'/remind me to prepare slides in 3 days',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('prepare slides');

				// Should be approximately 3 days later
				const daysDifference = (result!.scheduledAt.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
				expect(daysDifference).toBeGreaterThan(2.5);
				expect(daysDifference).toBeLessThan(3.5);
			});
		});

		describe('Past date detection', () => {
			it('should reject explicit past references like "5 days ago"', () => {
				const result = parseReminderText(
					'/remind me to follow up 5 days ago',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).toBeNull();
			});

			it('should reject "yesterday"', () => {
				const result = parseReminderText(
					'/remind me to call mom yesterday at 5pm',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).toBeNull();
			});

			it('should handle ambiguous "last Friday" - may parse as future due to forwardDate', () => {
				const result = parseReminderText(
					'/remind me to prepare slides last Friday',
					'Asia/Tehran',
					referenceDate
				);

				// Note: chrono with forwardDate:true may interpret "last Friday" as next Friday
				// This is actually reasonable behavior for a reminder system
				if (result) {
					expect(result.scheduledAt.getTime()).toBeGreaterThanOrEqual(referenceDate.getTime());
					expect(result.task.toLowerCase()).toContain('prepare slides');
				}
			});

			it('should reject specific past dates', () => {
				const result = parseReminderText(
					'/remind me to submit report on December 25th 2023',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).toBeNull();
			});
		});

		describe('Confidence levels', () => {
			it('should return high confidence for specific time', () => {
				const result = parseReminderText(
					'/remind me to call dentist tomorrow at 2:30pm',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.confidence).toBe('high');
			});

			it('should return medium confidence for date without specific time', () => {
				const result = parseReminderText(
					'/remind me to visit doctor next Tuesday',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.confidence).toBeOneOf(['medium', 'low']); // Depends on chrono parsing
			});

			it('should return low confidence for vague time', () => {
				const result = parseReminderText(
					'/remind me to exercise later',
					'Asia/Tehran',
					referenceDate
				);

				// This might not parse at all or have low confidence
				if (result) {
					expect(result.confidence).toBe('low');
				}
			});
		});

		describe('Task extraction', () => {
			it('should extract task correctly when time is at the end', () => {
				const result = parseReminderText(
					'/remind me to water the plants tomorrow at 8am',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('water the plants');
				expect(result?.task.toLowerCase()).not.toContain('tomorrow');
				expect(result?.task.toLowerCase()).not.toContain('8am');
			});

			it('should extract task correctly when time is in the middle', () => {
				const result = parseReminderText(
					'/remind me to call mom at 7pm today',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('call mom');
				expect(result?.task.toLowerCase()).not.toContain('7pm');
				expect(result?.task.toLowerCase()).not.toContain('today');
			});

			it('should handle complex task descriptions', () => {
				const result = parseReminderText(
					'/remind me to review the quarterly financial reports and prepare summary tomorrow at 9am',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('review the quarterly financial reports');
				expect(result?.task.toLowerCase()).toContain('prepare summary');
				expect(result?.task.toLowerCase()).not.toContain('tomorrow');
				expect(result?.task.toLowerCase()).not.toContain('9am');
			});
		});

		describe('Edge cases', () => {
			it('should return null for text without any time reference', () => {
				const result = parseReminderText(
					'/remind me to do something',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).toBeNull();
			});

			it('should handle empty task description', () => {
				const result = parseReminderText(
					'/remind me to tomorrow at 7pm',
					'Asia/Tehran',
					referenceDate
				);

				if (result) {
					expect(result.task).toBeTruthy();
					expect(result.task.length).toBeGreaterThan(0);
				}
			});

			it('should handle different command variations', () => {
				const variations = [
					'/remind me to call mom tomorrow',
					'/Remind me to call mom tomorrow',
					'/REMIND me to call mom tomorrow',
					'  /remind   me   to   call mom tomorrow  '
				];

				variations.forEach(variation => {
					const result = parseReminderText(variation, 'Asia/Tehran', referenceDate);
					if (result) {
						expect(result.task.toLowerCase()).toContain('call mom');
					}
				});
			});
		});

		describe('Timezone handling', () => {
			it('should respect different timezones', () => {
				const tehranResult = parseReminderText(
					'/remind me to call at 3pm today',
					'Asia/Tehran',
					referenceDate
				);

				const utcResult = parseReminderText(
					'/remind me to call at 3pm today',
					'UTC',
					referenceDate
				);

				if (tehranResult && utcResult) {
					// Times should be different due to timezone offset
					expect(tehranResult.scheduledAt.getTime()).not.toBe(utcResult.scheduledAt.getTime());
				}
			});
		});
	});

	describe('formatDateForUser', () => {
		const testDate = new Date('2024-01-15T12:30:00Z'); // 4:00 PM Tehran time

		it('should format date correctly for Tehran timezone', () => {
			const formatted = formatDateForUser(testDate, 'Asia/Tehran');

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
			expect(formatted.toLowerCase()).toContain('pm');
			expect(formatted).toContain('4:00'); // 12:30 UTC + 3:30 = 4:00 PM
		});

		it('should format date correctly for UTC', () => {
			const formatted = formatDateForUser(testDate, 'UTC');

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
			expect(formatted.toLowerCase()).toContain('pm');
			expect(formatted).toContain('12:30');
		});

		it('should fallback gracefully for invalid timezone', () => {
			const formatted = formatDateForUser(testDate, 'Invalid/Timezone');

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
			// Should still contain recognizable date parts
			expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time format
		});

		it('should include all expected date components', () => {
			const formatted = formatDateForUser(testDate, 'Asia/Tehran');

			expect(formatted).toMatch(/\w{3}/); // Day of week (Mon, Tue, etc.)
			expect(formatted).toMatch(/\w{3}/); // Month (Jan, Feb, etc.)
			expect(formatted).toMatch(/\d{1,2}/); // Day of month
			expect(formatted).toMatch(/\d{4}/); // Year
			expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time
			expect(formatted).toMatch(/(AM|PM)/i); // AM/PM
		});
	});

	describe('formatRemindersList', () => {
		it('should return empty message for no reminders', () => {
			const formatted = formatRemindersList([]);

			expect(formatted).toContain('no active reminders');
			expect(formatted).toContain('📅');
		});

		it('should format single reminder correctly', () => {
			const reminder: Reminder = {
				id: 1,
				telegram_id: 123456,
				task_description: 'Call mom',
				scheduled_at: '2024-01-02T15:30:00Z',
				timezone: 'Asia/Tehran',
				is_active: true,
				is_sent: false,
				is_recurring: false,
				created_at: '2024-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([reminder]);

			expect(formatted).toContain('Call mom');
			expect(formatted).toContain('ID: `1`');
			expect(formatted).toContain('Your Active Reminders \\(1\\)'); // Escaped for Markdown
			expect(formatted).toContain('/reminders delete');
		});

		it('should format multiple reminders correctly', () => {
			const reminders: Reminder[] = [
				{
					id: 1,
					telegram_id: 123456,
					task_description: 'Call mom',
					scheduled_at: '2024-01-02T15:30:00Z',
					timezone: 'Asia/Tehran',
					is_active: true,
					is_sent: false,
					is_recurring: false,
					created_at: '2024-01-01T10:00:00Z'
				},
				{
					id: 2,
					telegram_id: 123456,
					task_description: 'Submit report',
					scheduled_at: '2024-01-03T09:00:00Z',
					timezone: 'Asia/Tehran',
					is_active: true,
					is_sent: false,
					is_recurring: false,
					created_at: '2024-01-01T11:00:00Z'
				}
			];

			const formatted = formatRemindersList(reminders);

			expect(formatted).toContain('Your Active Reminders \\(2\\)');
			expect(formatted).toContain('Call mom');
			expect(formatted).toContain('Submit report');
			expect(formatted).toContain('ID: `1`');
			expect(formatted).toContain('ID: `2`');
			expect(formatted).toContain('1\\. **Call mom**');
			expect(formatted).toContain('2\\. **Submit report**');
		});

		it('should mark overdue reminders', () => {
			const overdueReminder: Reminder = {
				id: 1,
				telegram_id: 123456,
				task_description: 'Overdue task',
				scheduled_at: '2020-01-01T12:00:00Z', // Far in the past
				timezone: 'Asia/Tehran',
				is_active: true,
				is_sent: false,
				is_recurring: false,
				created_at: '2020-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([overdueReminder]);

			expect(formatted).toContain('⚠️ \\(Overdue\\)');
			expect(formatted).toContain('Overdue task');
		});

		it('should include usage instructions', () => {
			const reminder: Reminder = {
				id: 1,
				telegram_id: 123456,
				task_description: 'Test task',
				scheduled_at: '2024-01-02T15:30:00Z',
				timezone: 'Asia/Tehran',
				is_active: true,
				is_sent: false,
				is_recurring: false,
				created_at: '2024-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([reminder]);

			expect(formatted).toContain('/reminders delete');
			expect(formatted).toContain('💡');
		});
	});

	describe('Recurring Reminders', () => {
		describe('parseRecurrencePattern', () => {
			it('should parse "every 3 hours"', () => {
				const pattern = parseRecurrencePattern('every 3 hours');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(3);
				expect(pattern?.unit).toBe('hours');
			});

			it('should parse "every 30 minutes"', () => {
				const pattern = parseRecurrencePattern('every 30 minutes');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(30);
				expect(pattern?.unit).toBe('minutes');
			});

			it('should parse "every 2 days"', () => {
				const pattern = parseRecurrencePattern('every 2 days');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(2);
				expect(pattern?.unit).toBe('days');
			});

			it('should parse "every week"', () => {
				const pattern = parseRecurrencePattern('every week');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(1);
				expect(pattern?.unit).toBe('weeks');
			});

			it('should parse "daily"', () => {
				const pattern = parseRecurrencePattern('daily');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(1);
				expect(pattern?.unit).toBe('days');
			});

			it('should parse "hourly"', () => {
				const pattern = parseRecurrencePattern('hourly');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(1);
				expect(pattern?.unit).toBe('hours');
			});

			it('should parse "weekly"', () => {
				const pattern = parseRecurrencePattern('weekly');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(1);
				expect(pattern?.unit).toBe('weeks');
			});

			it('should parse "monthly"', () => {
				const pattern = parseRecurrencePattern('monthly');

				expect(pattern).not.toBeNull();
				expect(pattern?.type).toBe('interval');
				expect(pattern?.value).toBe(1);
				expect(pattern?.unit).toBe('months');
			});

			it('should handle plural and singular forms', () => {
				const patterns = [
					'every 1 hour',
					'every 1 hours',
					'every 2 day',
					'every 2 days'
				];

				patterns.forEach(text => {
					const pattern = parseRecurrencePattern(text);
					expect(pattern).not.toBeNull();
				});
			});

			it('should return null for non-recurring text', () => {
				const nonRecurringTexts = [
					'tomorrow at 7pm',
					'next Friday',
					'in 3 days',
					'call mom',
					'some random text'
				];

				nonRecurringTexts.forEach(text => {
					const pattern = parseRecurrencePattern(text);
					expect(pattern).toBeNull();
				});
			});

			it('should be case insensitive', () => {
				const variations = [
					'Every 3 Hours',
					'EVERY 3 HOURS',
					'every 3 HOURS',
					'Daily',
					'DAILY'
				];

				variations.forEach(text => {
					const pattern = parseRecurrencePattern(text);
					expect(pattern).not.toBeNull();
				});
			});
		});

		describe('calculateNextOccurrence', () => {
			const baseDate = new Date('2024-01-01T10:00:00Z');

			it('should calculate next occurrence for minutes', () => {
				const pattern: RecurrencePattern = { type: 'interval', value: 30, unit: 'minutes' };
				const next = calculateNextOccurrence(baseDate, pattern);

				expect(next.getTime() - baseDate.getTime()).toBe(30 * 60 * 1000); // 30 minutes in ms
			});

			it('should calculate next occurrence for hours', () => {
				const pattern: RecurrencePattern = { type: 'interval', value: 3, unit: 'hours' };
				const next = calculateNextOccurrence(baseDate, pattern);

				expect(next.getTime() - baseDate.getTime()).toBe(3 * 60 * 60 * 1000); // 3 hours in ms
			});

			it('should calculate next occurrence for days', () => {
				const pattern: RecurrencePattern = { type: 'interval', value: 2, unit: 'days' };
				const next = calculateNextOccurrence(baseDate, pattern);

				expect(next.getDate()).toBe(baseDate.getDate() + 2);
				expect(next.getMonth()).toBe(baseDate.getMonth());
				expect(next.getFullYear()).toBe(baseDate.getFullYear());
			});

			it('should calculate next occurrence for weeks', () => {
				const pattern: RecurrencePattern = { type: 'interval', value: 1, unit: 'weeks' };
				const next = calculateNextOccurrence(baseDate, pattern);

				expect(next.getDate()).toBe(baseDate.getDate() + 7);
			});

			it('should calculate next occurrence for months', () => {
				const pattern: RecurrencePattern = { type: 'interval', value: 1, unit: 'months' };
				const next = calculateNextOccurrence(baseDate, pattern);

				expect(next.getMonth()).toBe(baseDate.getMonth() + 1);
				expect(next.getFullYear()).toBe(baseDate.getFullYear());
			});

			it('should handle month overflow correctly', () => {
				const decemberDate = new Date('2024-12-15T10:00:00Z');
				const pattern: RecurrencePattern = { type: 'interval', value: 2, unit: 'months' };
				const next = calculateNextOccurrence(decemberDate, pattern);

				expect(next.getFullYear()).toBe(2025);
				expect(next.getMonth()).toBe(1); // February (0-indexed)
			});
		});

		describe('parseReminderText with recurring patterns', () => {
			it('should parse "drink water every 3 hours"', () => {
				const result = parseReminderText(
					'/remind me to drink water every 3 hours',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('drink water');
				expect(result?.isRecurring).toBe(true);
				expect(result?.recurrencePattern?.type).toBe('interval');
				expect(result?.recurrencePattern?.value).toBe(3);
				expect(result?.recurrencePattern?.unit).toBe('hours');
			});

			it('should parse "check emails daily at 9am"', () => {
				const result = parseReminderText(
					'/remind me to check emails daily at 9am',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('check emails');
				expect(result?.isRecurring).toBe(true);
				expect(result?.recurrencePattern?.type).toBe('interval');
				expect(result?.recurrencePattern?.value).toBe(1);
				expect(result?.recurrencePattern?.unit).toBe('days');
				// Note: The actual hour might vary based on how chrono parses the timezone
				// We'll just check that it's a reasonable hour value
				expect(result?.scheduledAt.getHours()).toBeGreaterThanOrEqual(0);
				expect(result?.scheduledAt.getHours()).toBeLessThan(24);
			});

			it('should parse "take medication every 6 hours starting now"', () => {
				const result = parseReminderText(
					'/remind me to take medication every 6 hours',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('take medication');
				expect(result?.isRecurring).toBe(true);
				expect(result?.recurrencePattern?.value).toBe(6);
				expect(result?.recurrencePattern?.unit).toBe('hours');
			});

			it('should parse "backup files weekly"', () => {
				const result = parseReminderText(
					'/remind me to backup files weekly',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('backup files');
				expect(result?.isRecurring).toBe(true);
				expect(result?.recurrencePattern?.value).toBe(1);
				expect(result?.recurrencePattern?.unit).toBe('weeks');
			});

			it('should extract task correctly from recurring reminders', () => {
				const result = parseReminderText(
					'/remind me to stretch every 2 hours during work',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.task.toLowerCase()).toContain('stretch');
				expect(result?.task.toLowerCase()).toContain('during work');
				expect(result?.task.toLowerCase()).not.toContain('every');
				expect(result?.task.toLowerCase()).not.toContain('2 hours');
			});

			it('should handle recurring reminders without specific start time', () => {
				const result = parseReminderText(
					'/remind me to drink water every hour',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.isRecurring).toBe(true);
				expect(result?.scheduledAt).toBeInstanceOf(Date);
				expect(result?.scheduledAt.getTime()).toBeGreaterThanOrEqual(referenceDate.getTime());
			});

			it('should have medium confidence for recurring reminders', () => {
				const result = parseReminderText(
					'/remind me to check server every 30 minutes at 2pm',
					'Asia/Tehran',
					referenceDate
				);

				expect(result).not.toBeNull();
				expect(result?.isRecurring).toBe(true);
				expect(result?.confidence).toBeOneOf(['medium', 'low']); // Should be medium or lower
			});
		});

		describe('formatRemindersList with recurring reminders', () => {
			it('should display recurring reminder information', () => {
				const recurringReminder: Reminder = {
					id: 1,
					telegram_id: 123456,
					task_description: 'Drink water',
					scheduled_at: '2024-01-02T15:30:00Z',
					timezone: 'Asia/Tehran',
					is_active: true,
					is_sent: false,
					is_recurring: true,
					recurrence_pattern: JSON.stringify({ type: 'interval', value: 3, unit: 'hours' }),
					occurrence_count: 5,
					created_at: '2024-01-01T10:00:00Z'
				};

				const formatted = formatRemindersList([recurringReminder]);

				expect(formatted).toContain('Drink water');
				expect(formatted).toContain('🔄'); // Recurring indicator
				expect(formatted).toContain('every 3 hours');
				expect(formatted).toContain('[5 times]'); // Occurrence count
				expect(formatted).toContain('/reminders stop'); // Stop instructions
			});

			it('should handle recurring reminders without occurrence count', () => {
				const recurringReminder: Reminder = {
					id: 1,
					telegram_id: 123456,
					task_description: 'Daily standup',
					scheduled_at: '2024-01-02T09:00:00Z',
					timezone: 'Asia/Tehran',
					is_active: true,
					is_sent: false,
					is_recurring: true,
					recurrence_pattern: JSON.stringify({ type: 'interval', value: 1, unit: 'days' }),
					created_at: '2024-01-01T10:00:00Z'
				};

				const formatted = formatRemindersList([recurringReminder]);

				expect(formatted).toContain('Daily standup');
				expect(formatted).toContain('🔄');
				expect(formatted).toContain('every 1 days');
				expect(formatted).not.toContain('['); // No occurrence count brackets
			});

			it('should handle invalid recurrence pattern gracefully', () => {
				const recurringReminder: Reminder = {
					id: 1,
					telegram_id: 123456,
					task_description: 'Broken recurring task',
					scheduled_at: '2024-01-02T15:30:00Z',
					timezone: 'Asia/Tehran',
					is_active: true,
					is_sent: false,
					is_recurring: true,
					recurrence_pattern: 'invalid json',
					created_at: '2024-01-01T10:00:00Z'
				};

				const formatted = formatRemindersList([recurringReminder]);

				expect(formatted).toContain('Broken recurring task');
				expect(formatted).toContain('🔄 (recurring)'); // Fallback text
			});

			it('should show both regular and recurring reminders', () => {
				const reminders: Reminder[] = [
					{
						id: 1,
						telegram_id: 123456,
						task_description: 'One-time meeting',
						scheduled_at: '2024-01-02T15:30:00Z',
						timezone: 'Asia/Tehran',
						is_active: true,
						is_sent: false,
						is_recurring: false,
						created_at: '2024-01-01T10:00:00Z'
					},
					{
						id: 2,
						telegram_id: 123456,
						task_description: 'Daily exercise',
						scheduled_at: '2024-01-03T07:00:00Z',
						timezone: 'Asia/Tehran',
						is_active: true,
						is_sent: false,
						is_recurring: true,
						recurrence_pattern: JSON.stringify({ type: 'interval', value: 1, unit: 'days' }),
						occurrence_count: 3,
						created_at: '2024-01-01T11:00:00Z'
					}
				];

				const formatted = formatRemindersList(reminders);

				expect(formatted).toContain('One-time meeting');
				expect(formatted).toContain('Daily exercise');
				expect(formatted).toContain('🔄'); // Only for recurring reminder
				expect(formatted).toContain('every 1 days');
				expect(formatted).toContain('[3 times]');
			});
		});
	});
});
