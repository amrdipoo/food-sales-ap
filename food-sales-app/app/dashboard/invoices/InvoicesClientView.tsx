// app/dashboard/invoices/InvoicesClientView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  softDeleteInvoiceAction,
  restoreInvoiceAction,
  updateInvoiceAction,
  getInvoicesList,
} from '../../actions/invoiceActions';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer: {
    name: string;
    phone: string;
  };
  sales_rep: {
    full_name: string;
  };
  total_amount: number;
  paid_amount: number;
  discount: number;
  status: 'pending' | 'partial' | 'paid' | 'deleted';
  created_at: string;
  remaining: number;
}

interface InvoicesClientViewProps {
  initialInvoices: Invoice[];
  userRole?: string | null;
  messages?: {
    updated?: string | null;
    deleted?: string | null;
    restored?: string | null;
  };
}

export default function InvoicesClientView({
  initialInvoices,
  userRole,
  messages,
}: InvoicesClientViewProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // عرض رسائل من Server Component
  const initialMessage = messages?.updated || messages?.deleted || messages?.restored;
  if (initialMessage && !message) {
    setMessage({ type: 'success', text: initialMessage });
  }

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الفاتورة "${invoiceNumber}"؟`)) return;

    setIsLoading(invoiceId);
    setMessage(null);

    const result = await softDeleteInvoiceAction(invoiceId);
    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم حذف الفاتورة بنجاح' });
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل حذف الفاتورة' });
    }
    setIsLoading(null);
  };

  const handleRestore = async (invoiceId: string) => {
    if (!confirm('هل أنت متأكد من استعادة هذه الفاتورة؟')) return;

    setIsLoading(invoiceId);
    setMessage(null);

    const result = await restoreInvoiceAction(invoiceId);
    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم استعادة الفاتورة بنجاح' });
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل استعادة الفاتورة' });
    }
    setIsLoading(null);
  };

  const handleUpdateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateInvoiceAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم تحديث الفاتورة بنجاح' });
      setEditingInvoice(null);
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تحديث الفاتورة' });
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ مدفوع</span>;
      case 'partial':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">🔄 جزئي</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">⏳ معلق</span>;
      case 'deleted':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">🗑️ محذوف</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 p-6" dir="rtl">
      {/* ... باقي الكود كما هو ... */}
    </div>
  );
}