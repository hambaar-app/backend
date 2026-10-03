import {
  getNotificationMessage,
  NotificationMessages,
} from './notification-messages';

/**
 * Placeholder substitution (Phase 4 Task 6).
 *
 * Locks the current template behavior: templates carry a `#` prefix
 * (`#{packageCode}`) but substitution targets single-brace `{key}`, so the
 * rendered message keeps the `#` (`#123`). Missing keys are left untouched.
 */
describe('getNotificationMessage', () => {
  describe('substitution', () => {
    it('should substitute package and trip codes keeping the hash prefix', () => {
      expect(
        getNotificationMessage(NotificationMessages.PackageCreated, {
          packageCode: 123,
        }),
      ).toBe(
        '📦 بسته شما با کد #123 با موفقیت ایجاد شد. حال می‌توانید برای سفرهای متناسب درخواست بفرستید.',
      );
    });

    it('should substitute every placeholder of a multi-key template', () => {
      expect(
        getNotificationMessage(NotificationMessages.TripRequestAccepted, {
          tripCode: 7,
          packageCode: 42,
        }),
      ).toBe('✅ عالی! درخواست سفر #7 برای بسته #42 پذیرفته شد.');
    });

    it('should substitute single-brace placeholders without hash', () => {
      expect(
        getNotificationMessage(NotificationMessages.NewTransporterNote, {
          transporterName: 'رضا',
          packageCode: 5,
          noteContent: 'سلام',
        }),
      ).toBe('📝 سفیر رضا برای بسته #5 یک یادداشت جدید ارسال کرده: سلام.');
    });
  });

  describe('missing context', () => {
    it('should leave missing placeholders untouched', () => {
      const message = getNotificationMessage(
        NotificationMessages.TripRequestAccepted,
      );

      expect(message).toContain('{tripCode}');
      expect(message).toContain('{packageCode}');
    });

    it('should substitute only the provided keys', () => {
      const message = getNotificationMessage(
        NotificationMessages.TripRequestAccepted,
        { tripCode: 7 },
      );

      expect(message).toContain('#7');
      expect(message).toContain('{packageCode}');
    });
  });
});
