export type InquiryFormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function validateInquiry(values: InquiryFormValues, requireMessage = false): string | null {
  if (!values.name.trim()) return "Please add your name.";
  if (values.name.trim().length > 100) return "Please keep your name under 100 characters.";
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return "Please enter a valid email address.";
  if (values.email.trim().length > 254) return "Please keep your email under 254 characters.";
  if (values.phone.trim().length > 40) return "Please keep your phone number under 40 characters.";
  if (requireMessage && !values.message.trim()) return "Please tell Samantha a little about your project.";
  if (values.message.length > 3000) return "Please keep your message under 3,000 characters.";
  return null;
}
