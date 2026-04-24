import { z } from 'zod';

export const companyOnboardingSchema = z.object({
  group_name: z.string().optional(),
  group_code: z.string().optional(),
  remarks_code: z.string().optional(),
  companies: z.object({
    legal_name: z.string().min(1, 'Legal name is required'),
    gst: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format'),
    idcode: z.string().min(1, 'ID Code is required'),
    iecode: z.string().min(1, 'IE Code is required'),
    address: z.string().min(1, 'Address is required'),
    brandname: z.string().min(1, 'Brand name is required'),
  }),
  signatories: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(10, 'Phone must be at least 10 characters'),
    designation: z.string().min(1, 'Designation is required'),
    employeeId: z.string().optional(),
  })).min(1, 'At least one signatory is required'),
});

export const companyActionSchema = z.object({
  id: z.string().uuid('Invalid onboarding ID'),
  action: z.enum(['approve', 'reject']),
  remark: z.string().optional(),
});

export const userOnboardingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  reporting_manager_email: z.string().email('Invalid manager email format'),
  designations: z.string().min(1, 'Designation is required'),
  employee_Id: z.string().min(1, 'Employee ID is required'),
  group_code: z.string().optional(),
  company_code: z.string().optional(),
});

export const userActionSchema = z.object({
  id: z.string().uuid('Invalid onboarding ID'),
  action: z.enum(['approve', 'reject']),
  remark: z.string().optional(),
});
