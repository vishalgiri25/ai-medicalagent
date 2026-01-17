import { integer, json, pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  credits: integer(),
  isPremium: boolean().default(false),
  premiumExpiresAt: varchar(),
  isAdmin: boolean().default(false),
  monthlyConsultations: integer().default(0),
  consultationsResetDate: varchar(),
});

export const SessionChatTable=pgTable('sessionChatTable',{
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sessionId: varchar().notNull(),
  notes:text(),
  selectedDoctor:json(),
  conversation:json(),
  report:json(),
  uploadedReports:json(), // Stores uploaded lab reports with AI analysis, risk levels
  createdBy:varchar().references(()=>usersTable.email),
  createdOn:varchar(),
})

export const PaymentTable = pgTable('paymentTable', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  transactionId: varchar({ length: 255 }).notNull().unique(),
  userEmail: varchar().notNull().references(() => usersTable.email),
  amount: varchar().notNull(),
  status: varchar().default('pending'), // pending, approved, rejected
  createdAt: varchar().notNull(),
  approvedAt: varchar(),
  approvedBy: varchar(),
  rejectionReason: text(),
})