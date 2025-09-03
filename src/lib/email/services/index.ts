// Email services barrel export
export { EmailService, emailService } from './EmailService';
export { EmailLogService } from './EmailLogService';
export { ContactService, contactService } from './ContactService';
export { MatchingService } from './MatchingService';
export { ProfileCompletionService } from './ProfileCompletionService';

// Types
export type { 
  SendEmailOptions,
  WelcomeEmailData,
  PasswordResetEmailData,
  ProfileReminderEmailData,
  WeeklyMatchEmailData
} from './EmailService';

export type {
  CreateContactData,
  CreateContactResult
} from './ContactService';

export type { EmailType } from './EmailLogService';
