export const redactPersonalInformation = (
  text: string
): string => {
  return text

    // Remove email addresses
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[EMAIL REDACTED]"
    )

    // Remove common phone number formats
    .replace(
      /(?<!\w)(?:\+91[\s-]?)?[6-9]\d{9}(?!\w)/g,
      "[PHONE REDACTED]"
    )

    // Remove URLs
    .replace(
      /(?:https?:\/\/|www\.)[^\s]+/gi,
      "[URL REDACTED]"
    )

    // Remove explicitly labelled personal details
    .replace(
      /^(?:name|date of birth|dob|address|gender|marital status)\s*[:\-].*$/gim,
      "[PERSONAL INFORMATION REDACTED]"
    )

    .trim();
};