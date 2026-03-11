declare module 'mailparser' {
  import type { Readable } from 'stream';
  export interface ParsedMail {
    messageId?: string;
    from?: { text: string; value: { address: string }[] };
    to?: { text: string; value: { address: string }[] };
    subject?: string;
    text?: string;
    html?: string;
    attachments?: { filename?: string; content: Buffer; contentType?: string }[];
  }
  export function simpleParser(
    source: Buffer | Readable,
    options?: Record<string, unknown>
  ): Promise<ParsedMail>;
}

declare module 'nodemailer' {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  }
  interface SendMailOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  }
  interface Transporter {
    sendMail(options: SendMailOptions): Promise<{ messageId?: string }>;
  }
  function createTransport(options: TransportOptions): Transporter;
}
