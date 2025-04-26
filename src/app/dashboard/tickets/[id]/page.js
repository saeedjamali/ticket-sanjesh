"use client";

// This file will be a clean server component
import TicketDetailClient from "@/components/tickets/TicketDetailClient";

// Server Component
export default function TicketPage({ params }) {
  return <TicketDetailClient ticketId={params.id} />;
}
