declare module 'resend' {
  interface SendEmailOptions {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
    }>;
  }

  interface SendEmailResponse {
    data: {
      id: string;
    } | null;
    error: {
      message: string;
      name: string;
    } | null;
  }

  interface EmailsAPI {
    send(options: SendEmailOptions): Promise<SendEmailResponse>;
  }

  export class Resend {
    emails: EmailsAPI;
    constructor(apiKey?: string);
  }
}
