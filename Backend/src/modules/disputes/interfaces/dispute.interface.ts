export interface Dispute {
  id: string;
  transactionId: string;
  raisedBy: string;
  againstUser: string;
  description: string;
  category: 'payment' | 'fraud' | 'service' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  resolvedAt?: FirebaseFirestore.Timestamp;
  resolution?: string;
  escalatedAt?: FirebaseFirestore.Timestamp;
  escalationReason?: string;
  notes?: string;
  assignedTo?: string;
}
