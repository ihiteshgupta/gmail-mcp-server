import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

export class GmailClient {
  private gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: "v1", auth });
  }

  async listMessages(options: {
    query?: string;
    maxResults?: number;
    labelIds?: string[];
  }): Promise<gmail_v1.Schema$Message[]> {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      q: options.query,
      maxResults: options.maxResults || 10,
      labelIds: options.labelIds,
    });

    return response.data.messages || [];
  }

  async getMessage(
    messageId: string,
    format: "full" | "metadata" | "minimal" | "raw" = "full"
  ): Promise<gmail_v1.Schema$Message> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format,
    });

    return response.data;
  }

  async getMessageContent(messageId: string): Promise<{
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    snippet: string;
    labels: string[];
  }> {
    const message = await this.getMessage(messageId, "full");

    const headers = message.payload?.headers || [];
    const getHeader = (name: string): string =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value || "";

    let body = "";
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
    } else if (message.payload?.parts) {
      const textPart = message.payload.parts.find(
        (p) => p.mimeType === "text/plain"
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      } else {
        const htmlPart = message.payload.parts.find(
          (p) => p.mimeType === "text/html"
        );
        if (htmlPart?.body?.data) {
          body = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
        }
      }
    }

    return {
      id: message.id || "",
      threadId: message.threadId || "",
      subject: getHeader("Subject"),
      from: getHeader("From"),
      to: getHeader("To"),
      date: getHeader("Date"),
      body,
      snippet: message.snippet || "",
      labels: message.labelIds || [],
    };
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    attachments?: { filename: string; content: string; mimeType: string }[];
  }): Promise<gmail_v1.Schema$Message> {
    const messageParts = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      "MIME-Version: 1.0",
    ];

    if (options.cc) {
      messageParts.push(`Cc: ${options.cc}`);
    }
    if (options.bcc) {
      messageParts.push(`Bcc: ${options.bcc}`);
    }

    if (options.attachments && options.attachments.length > 0) {
      const boundary = "boundary_" + Date.now();
      messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      messageParts.push("");
      messageParts.push(`--${boundary}`);
      messageParts.push("Content-Type: text/plain; charset=utf-8");
      messageParts.push("");
      messageParts.push(options.body);

      for (const attachment of options.attachments) {
        messageParts.push(`--${boundary}`);
        messageParts.push(
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`
        );
        messageParts.push("Content-Transfer-Encoding: base64");
        messageParts.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`
        );
        messageParts.push("");
        messageParts.push(attachment.content);
      }
      messageParts.push(`--${boundary}--`);
    } else {
      messageParts.push("Content-Type: text/plain; charset=utf-8");
      messageParts.push("");
      messageParts.push(options.body);
    }

    const rawMessage = Buffer.from(messageParts.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
        threadId: options.threadId,
      },
    });

    return response.data;
  }

  async createDraft(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
  }): Promise<gmail_v1.Schema$Draft> {
    const messageParts = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
    ];

    if (options.cc) {
      messageParts.push(`Cc: ${options.cc}`);
    }
    if (options.bcc) {
      messageParts.push(`Bcc: ${options.bcc}`);
    }

    messageParts.push("");
    messageParts.push(options.body);

    const rawMessage = Buffer.from(messageParts.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await this.gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: rawMessage,
          threadId: options.threadId,
        },
      },
    });

    return response.data;
  }

  async listDrafts(maxResults: number = 10): Promise<gmail_v1.Schema$Draft[]> {
    const response = await this.gmail.users.drafts.list({
      userId: "me",
      maxResults,
    });

    return response.data.drafts || [];
  }

  async getDraft(draftId: string): Promise<gmail_v1.Schema$Draft> {
    const response = await this.gmail.users.drafts.get({
      userId: "me",
      id: draftId,
    });

    return response.data;
  }

  async sendDraft(draftId: string): Promise<gmail_v1.Schema$Message> {
    const response = await this.gmail.users.drafts.send({
      userId: "me",
      requestBody: {
        id: draftId,
      },
    });

    return response.data;
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.gmail.users.drafts.delete({
      userId: "me",
      id: draftId,
    });
  }

  async trashMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    const response = await this.gmail.users.messages.trash({
      userId: "me",
      id: messageId,
    });

    return response.data;
  }

  async untrashMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    const response = await this.gmail.users.messages.untrash({
      userId: "me",
      id: messageId,
    });

    return response.data;
  }

  async modifyLabels(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<gmail_v1.Schema$Message> {
    const response = await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });

    return response.data;
  }

  async markAsRead(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyLabels(messageId, undefined, ["UNREAD"]);
  }

  async markAsUnread(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyLabels(messageId, ["UNREAD"]);
  }

  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    const response = await this.gmail.users.labels.list({
      userId: "me",
    });

    return response.data.labels || [];
  }

  async createLabel(
    name: string,
    options?: {
      labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
      messageListVisibility?: "show" | "hide";
    }
  ): Promise<gmail_v1.Schema$Label> {
    const response = await this.gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name,
        labelListVisibility: options?.labelListVisibility || "labelShow",
        messageListVisibility: options?.messageListVisibility || "show",
      },
    });

    return response.data;
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.gmail.users.labels.delete({
      userId: "me",
      id: labelId,
    });
  }

  async getProfile(): Promise<gmail_v1.Schema$Profile> {
    const response = await this.gmail.users.getProfile({
      userId: "me",
    });

    return response.data;
  }

  async searchEmails(
    query: string,
    maxResults: number = 10
  ): Promise<
    {
      id: string;
      threadId: string;
      subject: string;
      from: string;
      date: string;
      snippet: string;
    }[]
  > {
    const messages = await this.listMessages({ query, maxResults });
    const results = [];

    for (const msg of messages) {
      if (msg.id) {
        const content = await this.getMessageContent(msg.id);
        results.push({
          id: content.id,
          threadId: content.threadId,
          subject: content.subject,
          from: content.from,
          date: content.date,
          snippet: content.snippet,
        });
      }
    }

    return results;
  }

  async getThread(threadId: string): Promise<gmail_v1.Schema$Thread> {
    const response = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });

    return response.data;
  }

  async getAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<string> {
    const response = await this.gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    return response.data.data || "";
  }

  async listAttachments(
    messageId: string
  ): Promise<{ filename: string; mimeType: string; attachmentId: string }[]> {
    const message = await this.getMessage(messageId, "full");
    const attachments: {
      filename: string;
      mimeType: string;
      attachmentId: string;
    }[] = [];

    const extractAttachments = (parts: gmail_v1.Schema$MessagePart[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || "application/octet-stream",
            attachmentId: part.body.attachmentId,
          });
        }
        if (part.parts) {
          extractAttachments(part.parts);
        }
      }
    };

    if (message.payload?.parts) {
      extractAttachments(message.payload.parts);
    }

    return attachments;
  }
}
