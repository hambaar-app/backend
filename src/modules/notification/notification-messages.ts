export enum NotificationMessages {
  Welcome = '🎉 به پلتفرم هم‌بار خوش آمدید.',
  PackageCreated = '📦 بسته شما با کد #{packageCode} با موفقیت ایجاد شد. حال می‌توانید برای سفرهای متناسب درخواست بفرستید.',
  PackagePickedUp = '🚛 بسته #{packageCode} دریافت شد. در مسیر است!',
  PackageDelivered = '🎊 بسته #{packageCode} با موفقیت تحویل داده شد. از اعتماد شما سپاسگزاریم!',
  TripCreated = '🚚 سفر شما با کد #{tripCode} با موفقیت ایجاد شد.',
  TripRequestCreated = '📬 درخواست سفر #{tripCode} برای بسته #{packageCode} ارسال شد. منتظر تأیید باشید!',
  TripRequestCanceled = '❌ درخواست سفر #{tripCode} برای بسته #{packageCode} با موفقیت لغو شد.',
  TripRequestAccepted = '✅ عالی! درخواست سفر #{tripCode} برای بسته #{packageCode} پذیرفته شد.',
  TripRequestRejected = '⚠️ متأسفانه درخواست سفر #{tripCode} برای بسته #{packageCode} رد شد.',
  NewTransporterNote = '📝 سفیر {transporterName} برای بسته #{packageCode} یک یادداشت جدید ارسال کرده: {noteContent}.',
}

export interface NotificationContext {
  packageCode?: number;
  tripCode?: number;
  transporterName?: string;
  noteContent?: string;
}

export function getNotificationMessage(
  messageKey: NotificationMessages,
  context: NotificationContext = {},
): string {
  let baseMessage = messageKey as string;

  // Replace placeholders with a value
  Object.keys(context).forEach((key) => {
    const placeholder = `{${key}}`;
    baseMessage = baseMessage.replace(
      new RegExp(placeholder, 'g'),
      context[key],
    );
  });

  return baseMessage;
}
