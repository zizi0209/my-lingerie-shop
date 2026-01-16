/**
 * Temp Mail Domain Blacklist
 * Danh sách các domain email tạm thời/rác thường dùng để spam
 * Cập nhật định kỳ khi phát hiện domain mới
 */

export const TEMP_MAIL_DOMAINS = new Set([
  // Popular temp mail services
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'guerrillamail.biz',
  'sharklasers.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'maildrop.cc',
  'throwaway.email',
  'throwawaymail.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'dispostable.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'tempinbox.com',
  'mohmal.com',
  'getnada.com',
  'getairmail.com',
  'mailnesia.com',
  'tempail.com',
  'tempr.email',
  'discard.email',
  'mailsac.com',
  'emailondeck.com',
  'spamgourmet.com',
  'mintemail.com',
  'mytrashmail.com',
  'mt2009.com',
  'thankyou2010.com',
  'trash2009.com',
  'mail-temporaire.fr',
  'jetable.org',
  'spam4.me',
  'grr.la',
  'inboxalias.com',
  
  // Vietnamese temp mail
  'emlpro.com',
  'emlhub.com',
  'tmail.ws',
  
  // Additional suspicious domains
  'mailcatch.com',
  'spamavert.com',
  'spambox.us',
  'spamfree24.org',
  'spamherelots.com',
  'tempomail.fr',
  'tmpmail.org',
  'tmpmail.net',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'wh4f.org',
  'whyspam.me',
  'willselfdestruct.com',
  'xoxy.net',
  'zoemail.net',
  'mailexpire.com',
  'tempmailo.com',
  'emailfake.com',
  'crazymailing.com',
  'fakemailgenerator.com',
  'generator.email',
  'emailnax.com',
  'burnermail.io',
  'temp.headstrong.de',
  'anonymbox.com',
  'anonymmail.net',
]);

/**
 * Check if email domain is in blacklist
 */
export function isTempMail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return TEMP_MAIL_DOMAINS.has(domain);
}

/**
 * Validate email for newsletter subscription
 * Returns error message if invalid, null if valid
 */
export function validateNewsletterEmail(email: string): string | null {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không hợp lệ';
  }
  
  // Temp mail check
  if (isTempMail(email)) {
    return 'Vui lòng sử dụng email chính thức, không chấp nhận email tạm thời';
  }
  
  return null;
}
