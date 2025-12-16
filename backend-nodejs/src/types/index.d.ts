// Type definitions for Patient Role Backend

export interface Patient {
  id: number;
  fullName: string;
  email: string;
  password: string; // hashed in real app, plain for demo
  phone: string;
  address: string;
  dateOfBirth: string; // ISO date string
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  department: string;
  licenseNumber: string;
  schedule: {
    monday: string[]; // time slots like ["08:00-09:00", "09:00-10:00"]
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
    sunday: string[];
  };
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  date: string; // ISO date string
  timeSlot: string; // e.g., "08:00-09:00"
  reason: string;
  symptoms?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: number;
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  visitDate: string; // ISO date string
  diagnosis: string;
  symptoms: string;
  prescription?: string;
  notes?: string;
  testResults?: {
    testName: string;
    result: string;
    date: string;
  }[];
  followUpDate?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Invoice {
  id: number;
  patientId: number;
  appointmentId?: number;
  medicalRecordId?: number;
  amount: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  paymentMethod?: 'cash' | 'card' | 'momo' | 'bank_transfer';
  paidAt?: string;
  createdAt: string;
  dueDate: string;
}

export interface Insurance {
  id: number;
  patientId: number;
  bhytNumber: string; // Bảo hiểm y tế number
  startDate: string;
  endDate: string;
  registeredHospital: string;
  coverageType: 'full' | 'partial';
  updatedAt: string;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  patient: Omit<Patient, 'password'>;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

// Import Request từ express
import { Request } from 'express';

/**
 * AuthenticatedRequest - Request đã được authenticate
 * Extends Express Request và đảm bảo có user property
 * 
 * Tất cả properties từ Express Request đều có sẵn:
 * - req.params: Route parameters (type: { [key: string]: string })
 * - req.query: Query string parameters (type: ParsedQs)
 * - req.body: Request body (type: any hoặc có thể type-safe hơn)
 * - req.user: User info từ authentication middleware
 */
export interface AuthenticatedRequest extends Request {
  /**
   * User information từ authentication middleware
   * Được populate bởi mockPatientAuth hoặc JWT middleware
   */
  user: {
    id?: string;
    role?: 'admin' | 'doctor' | 'nurse' | 'patient';
    patientId: number | string; // Required cho patient routes
    userId?: number | string;
  };
}

