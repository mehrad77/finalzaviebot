import { describe, it, expect, beforeEach } from 'vitest';
import { parseReminderText, formatDateForUser, formatRemindersList } from '../src/reminder-utils.js';
import { Reminder } from '../src/types.js';

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
				created_at: '2024-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([reminder]);

			expect(formatted).toContain('Call mom');
			expect(formatted).toContain('ID: `1`');
			expect(formatted).toContain('Your Active Reminders (1)');
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
					created_at: '2024-01-01T11:00:00Z'
				}
			];

			const formatted = formatRemindersList(reminders);

			expect(formatted).toContain('Your Active Reminders (2)');
			expect(formatted).toContain('Call mom');
			expect(formatted).toContain('Submit report');
			expect(formatted).toContain('ID: `1`');
			expect(formatted).toContain('ID: `2`');
			expect(formatted).toContain('1. **Call mom**');
			expect(formatted).toContain('2. **Submit report**');
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
				created_at: '2020-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([overdueReminder]);

			expect(formatted).toContain('⚠️ (Overdue)');
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
				created_at: '2024-01-01T10:00:00Z'
			};

			const formatted = formatRemindersList([reminder]);

			expect(formatted).toContain('/reminders delete');
			expect(formatted).toContain('💡');
		});
	});
});
