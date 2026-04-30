function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

function buildWelcomeMessage(student) {
  return [
    `Hello ${student.name}, welcome to Brainbyte Library.`,
    `Your admission is confirmed for seat ${student.seatNumber}${student.hallName ? ` in ${student.hallName}` : ""}.`,
    `Plan: ${student.plan}.`,
    student.paidTill ? `Current access is active till ${new Date(student.paidTill).toLocaleDateString("en-IN")}.` : "Please complete your fee setup if pending.",
    "Thank you for joining us."
  ].join(" ");
}

function buildReminderMessage(student) {
  return [
    `Hello ${student.name}, this is a friendly reminder from Brainbyte Library.`,
    `Your seat ${student.seatNumber}${student.hallName ? ` in ${student.hallName}` : ""} is linked to the ${student.plan} plan.`,
    student.paidTill
      ? `Your current paid period is till ${new Date(student.paidTill).toLocaleDateString("en-IN")}. Please renew your fees on time to avoid interruption.`
      : "Our records show your fee payment is pending. Please clear it at the earliest.",
    "Reply here if you need any help."
  ].join(" ");
}

function buildMessageLinks(student, message) {
  const normalizedPhone = normalizePhone(student.phone);
  const encoded = encodeURIComponent(message);

  return {
    whatsapp: `https://wa.me/${normalizedPhone}?text=${encoded}`,
    sms: `sms:${normalizedPhone}?body=${encoded}`
  };
}

export function getStudentMessageActions(student) {
  const welcomeMessage = buildWelcomeMessage(student);
  const reminderMessage = buildReminderMessage(student);

  return {
    welcomeMessage,
    reminderMessage,
    welcomeLinks: buildMessageLinks(student, welcomeMessage),
    reminderLinks: buildMessageLinks(student, reminderMessage)
  };
}
